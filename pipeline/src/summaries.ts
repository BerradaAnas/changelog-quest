import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  ChangeKind,
  checkSummary,
  compareVersions,
  Release,
  ReleaseSummary,
  Slug,
  Version,
} from "@cq/schemas";
import { z } from "zod";
import { config } from "./config.ts";
import { readCollection } from "./content.ts";

/**
 * Summary drafting support (ADR 0010). Drafts are written in a Claude Code session with the
 * `draft-summary` skill, not by an API call. This module picks the next batch and turns a
 * compact draft into a validated `ReleaseSummary` file with status "draft".
 */

export interface BatchLimits {
  releases: number;
  items: number;
  /** ISO date: releases published before it are skipped unless they already have a summary. */
  cutoff?: string;
}

/** Releases in scope (see `pendingSummaries`) with no summary, or a stale one. */
export function needingSummary(
  releases: readonly Release[],
  summaries: ReadonlyMap<string, ReleaseSummary>,
  cutoff?: string,
): Release[] {
  return releases.filter((r) => {
    const summary = summaries.get(r.version);
    if (summary?.sourceHash === r.sourceHash) return false;
    return summary !== undefined || cutoff === undefined || r.publishedAt >= cutoff;
  });
}

/**
 * The next releases to summarize, newest first: those with no summary, or whose summary was
 * written against an older source text. With `limits.cutoff`, releases published before it
 * are left out unless they already have a summary (ADR 0013). A batch stops at
 * `limits.releases` releases or once it holds `limits.items` change items, so one review
 * stays readable; it always holds at least one release.
 */
export function pendingSummaries(
  releases: readonly Release[],
  summaries: ReadonlyMap<string, ReleaseSummary>,
  limits: BatchLimits,
): Release[] {
  const pending = needingSummary(releases, summaries, limits.cutoff).sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt) || compareVersions(b.version, a.version),
  );
  const batch: Release[] = [];
  let items = 0;
  for (const release of pending) {
    if (batch.length >= limits.releases) break;
    if (batch.length > 0 && items + release.items.length > limits.items) break;
    batch.push(release);
    items += release.items.length;
  }
  return batch;
}

/**
 * What the drafting session writes for one release. `covers` takes full item ids or just the
 * part after "#". An item's classification comes from the lines that cover it: the kind of
 * the first one, and every feature id they name.
 */
export const SummaryDraft = z.strictObject({
  version: Version,
  title: z.string().min(1).max(80),
  headline: z.string().min(1).max(200),
  lines: z
    .array(
      z.strictObject({
        kind: ChangeKind,
        text: z.string().min(1),
        covers: z.array(z.string().min(1)).min(1),
        featureIds: z.array(Slug).optional(),
        /** Added items reviewed as belonging to no feature (ADR 0017). */
        noFeature: z.literal(true).optional(),
      }),
    )
    .min(1),
  /** Small fixes and changes counted instead of summarized, by kind (ADR 0016). */
  minor: z
    .strictObject({
      changed: z.array(z.string().min(1)).optional(),
      fixed: z.array(z.string().min(1)).optional(),
      other: z.array(z.string().min(1)).optional(),
    })
    .optional(),
});
export type SummaryDraft = z.infer<typeof SummaryDraft>;

export interface DraftMeta {
  model: string;
  promptVersion: string;
  generatedAt: string;
}

/**
 * Builds the draft summary for a release. A draft that fails the schema or the "nothing
 * lost" rules is rejected with every problem listed; it is never repaired here.
 */
export function buildSummary(release: Release, draft: SummaryDraft, meta: DraftMeta) {
  if (draft.version !== release.version) {
    throw new Error(`draft is for ${draft.version}, release is ${release.version}`);
  }
  const fullId = (id: string) => (id.includes("#") ? id : `${release.version}#${id}`);
  const lines = draft.lines.map((l) => ({
    kind: l.kind,
    text: l.text,
    covers: l.covers.map(fullId),
  }));
  const classifications: ReleaseSummary["classifications"] = {};
  draft.lines.forEach((line, n) => {
    for (const id of lines[n]?.covers ?? []) {
      const c = classifications[id] ?? { kind: line.kind, featureIds: [] };
      for (const f of line.featureIds ?? []) if (!c.featureIds.includes(f)) c.featureIds.push(f);
      if (line.noFeature) c.noFeature = true;
      classifications[id] = c;
    }
  });
  for (const [kind, ids] of Object.entries(draft.minor ?? {}) as [ChangeKind, string[]][]) {
    for (const id of ids.map(fullId)) {
      if (classifications[id])
        throw new Error(`draft rejected:\n  item ${id} is minor but also covered by a line`);
      classifications[id] = { kind, featureIds: [], minor: true };
    }
  }
  const summary = ReleaseSummary.parse({
    version: release.version,
    sourceHash: release.sourceHash,
    title: draft.title,
    headline: draft.headline,
    lines,
    classifications,
    status: "draft",
    ...meta,
  });
  const errors = checkSummary(release, summary).filter((i) => i.level === "error");
  if (errors.length > 0) {
    throw new Error(`draft rejected:\n${errors.map((e) => `  ${e.message}`).join("\n")}`);
  }
  return summary;
}

async function load(root: string) {
  const releases = (await readCollection(root, "releases")).map((f) => Release.parse(f.data));
  const summaries = new Map(
    (await readCollection(root, "summaries")).map((f) => {
      const s = ReleaseSummary.parse(f.data);
      return [s.version, s] as const;
    }),
  );
  return { releases, summaries };
}

async function pending(root: string): Promise<void> {
  const { releases, summaries } = await load(root);
  const batch = pendingSummaries(releases, summaries, {
    releases: config.backfillBatchSize,
    items: config.backfillBatchItems,
    cutoff: config.summaryCutoff,
  });
  const total = needingSummary(releases, summaries, config.summaryCutoff);
  for (const r of batch) {
    const stale = summaries.has(r.version) ? "  (source changed since its summary)" : "";
    console.log(`${r.version}  ${r.publishedAt.slice(0, 10)}  ${r.items.length} items${stale}`);
  }
  console.log(
    `${batch.length} in this batch, ${total.length} release(s) since ${config.summaryCutoff.slice(0, 10)} without a current summary`,
  );
}

async function write(
  root: string,
  draftPath: string,
  model: string,
  replace: boolean,
): Promise<void> {
  // pnpm runs this script from pipeline/; INIT_CWD is where the command was typed.
  const path = resolve(process.env.INIT_CWD ?? process.cwd(), draftPath);
  const draft = SummaryDraft.parse(JSON.parse(await readFile(path, "utf8")));
  const { releases, summaries } = await load(root);
  const release = releases.find((r) => r.version === draft.version);
  if (!release) throw new Error(`no release ${draft.version}`);
  const old = summaries.get(draft.version);
  if (old?.sourceHash === release.sourceHash) {
    if (old.status === "approved") {
      throw new Error(`${draft.version} already has an approved summary; edit that file instead`);
    }
    if (!replace) {
      throw new Error(
        `${draft.version} already has a draft, which may hold a reviewer's edits; pass --replace to overwrite it`,
      );
    }
  }
  const summary = buildSummary(release, draft, {
    model,
    promptVersion: config.summaryPromptVersion,
    generatedAt: new Date().toISOString(),
  });
  await mkdir(join(root, "summaries"), { recursive: true });
  await writeFile(
    join(root, "summaries", `${summary.version}.json`),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(`${summary.version}: draft written, ${summary.lines.length} lines`);
  // Possible new features (ADR 0017): additions that link no feature and aren't marked.
  const unlinked = Object.entries(summary.classifications).filter(
    ([, c]) => c.kind === "added" && c.featureIds.length === 0 && !c.noFeature,
  );
  if (unlinked.length > 0) {
    console.log(
      `  ${unlinked.length} added item(s) link no feature; for each, link a feature, add one (add-feature skill), or mark the line noFeature:`,
    );
    for (const [id] of unlinked) console.log(`    ${id}`);
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      model: { type: "string" },
      replace: { type: "boolean", default: false },
      content: { type: "string", default: "../content" },
    },
  });
  const [command, arg] = positionals;
  if (command === "pending") await pending(values.content);
  else if (command === "write" && arg && values.model)
    await write(values.content, arg, values.model, values.replace);
  else {
    console.error(
      "usage: pnpm summaries pending | pnpm summaries write <draft.json> --model <model id> [--replace]",
    );
    process.exitCode = 2;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
