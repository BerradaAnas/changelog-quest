import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkSummary,
  configPreviewPlaceholders,
  Demo,
  Feature,
  IngestRun,
  type Issue,
  Release,
  ReleaseSummary,
} from "@cq/schemas";
import type { z } from "zod";
import { readCollection } from "./content.ts";
import { changeItemIds, sha256 } from "./ids.ts";

export interface FileIssue extends Issue {
  file: string;
}

/**
 * Validates everything under content/: schemas, file names, ids, cross references,
 * and the "nothing lost" coverage rules. Any error fails CI.
 */
export async function validateContent(root: string): Promise<FileIssue[]> {
  const issues: FileIssue[] = [];
  const at = (file: string) => ({
    error: (message: string) => issues.push({ level: "error", file, message }),
    warn: (message: string) => issues.push({ level: "warning", file, message }),
  });

  async function load<S extends z.ZodType>(
    collection: Parameters<typeof readCollection>[1],
    schema: S,
  ) {
    const out: { file: string; key: string; value: z.infer<S> }[] = [];
    for (const f of await readCollection(root, collection)) {
      const file = relative(root, f.path);
      if (f.data instanceof SyntaxError) {
        at(file).error(`invalid JSON: ${f.data.message}`);
        continue;
      }
      const parsed = schema.safeParse(f.data);
      if (!parsed.success) {
        for (const i of parsed.error.issues)
          at(file).error(`${i.path.join(".") || "(root)"}: ${i.message}`);
        continue;
      }
      out.push({ file, key: f.key, value: parsed.data });
    }
    return out;
  }

  const releases = await load("releases", Release);
  const summaries = await load("summaries", ReleaseSummary);
  const features = await load("features", Feature);
  const demos = await load("demos", Demo);
  await load("runs", IngestRun);

  const releaseByVersion = new Map(releases.map((r) => [r.value.version, r.value]));
  const featureIds = new Set(features.map((f) => f.value.id));
  const linkedFeatures = new Map<string, Set<string>>(); // version -> feature ids

  for (const { file, key, value: r } of releases) {
    const { error } = at(file);
    if (key !== r.version) error(`file name must be ${r.version}.json`);
    if (sha256(r.rawMarkdown) !== r.sourceHash) error("sourceHash does not match rawMarkdown");
    const expected = changeItemIds(
      r.version,
      r.items.map((i) => i.rawText),
    );
    r.items.forEach((item, n) => {
      if (item.position !== n)
        error(`item ${item.id} has position ${item.position}, expected ${n}`);
      if (item.id !== expected[n]) error(`item ${n} id should be ${expected[n]}`);
    });
  }

  for (const { file, key, value: s } of summaries) {
    const { error, warn } = at(file);
    if (key !== s.version) error(`file name must be ${s.version}.json`);
    const release = releaseByVersion.get(s.version);
    if (!release) {
      error(`no release ${s.version}`);
      continue;
    }
    for (const i of checkSummary(release, s)) (i.level === "error" ? error : warn)(i.message);
    const linked = new Set<string>();
    for (const [id, c] of Object.entries(s.classifications)) {
      for (const f of c.featureIds) {
        if (!featureIds.has(f)) error(`${id} links unknown feature ${f}`);
        linked.add(f);
      }
    }
    linkedFeatures.set(s.version, linked);
  }

  for (const { file, key, value: f } of features) {
    const { error, warn } = at(file);
    if (key !== f.id) error(`file name must be ${f.id}.json`);
    for (const e of f.events) {
      if (!releaseByVersion.has(e.version))
        error(`event ${e.type} references unknown release ${e.version}`);
      const linked = linkedFeatures.get(e.version);
      if (linked && !linked.has(f.id)) {
        warn(`${e.type} event in ${e.version}, but no item of that release links to ${f.id}`);
      }
    }
  }

  for (const { file, key, value: d } of demos) {
    const { error } = at(file);
    if (key !== d.featureId) error(`file name must be ${d.featureId}.json`);
    if (!featureIds.has(d.featureId)) error(`unknown feature ${d.featureId}`);
    const inputs = new Map(d.inputs.map((i) => [i.id, i]));
    if (d.kind === "choose" && d.inputs.some((i) => !i.options))
      error("choose demos need options on every input");
    d.rules.forEach((rule, n) => {
      for (const c of rule.when) {
        const input = inputs.get(c.input);
        if (!input) {
          error(`rule ${n + 1} uses unknown input ${c.input}`);
          continue;
        }
        if (c.matches !== undefined) {
          try {
            new RegExp(c.matches, "i");
          } catch {
            error(`rule ${n + 1} has an invalid regular expression`);
          }
        }
        if (c.equals !== undefined && input.options && !input.options.includes(c.equals)) {
          error(`rule ${n + 1} expects "${c.equals}", which is not an option of ${c.input}`);
        }
      }
    });
    for (const p of configPreviewPlaceholders(d.configPreview ?? "")) {
      if (!inputs.has(p)) error(`configPreview uses unknown input ${p}`);
    }
  }

  return issues;
}

async function main() {
  const root = process.argv[2] ?? "content";
  const issues = await validateContent(root);
  for (const i of issues) console.log(`${i.level === "error" ? "✗" : "!"} ${i.file}: ${i.message}`);
  const errors = issues.filter((i) => i.level === "error").length;
  console.log(`${errors} error(s), ${issues.length - errors} warning(s)`);
  if (errors > 0) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
