import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { IngestRun, Release } from "@cq/schemas";
import { readCollection } from "./content.ts";
import { sha256 } from "./ids.ts";
import { fetchPublishDates } from "./npm.ts";
import {
  type ChangelogSection,
  parseChangelog,
  type ReleaseSource,
  toRelease,
} from "./parse-changelog.ts";
import { fetchChangelog, latestCommit } from "./source.ts";

export type ReleaseDate = Pick<ReleaseSource, "publishedAt" | "dateSource">;

/**
 * Dates for every section, newest first like the changelog. A version missing from npm takes
 * the publish time of the nearest newer version that is on npm (ADR 0009). A version with no
 * newer published version gets no date yet: npm usually catches up within hours.
 */
export function releaseDates(
  sections: readonly ChangelogSection[],
  npm: ReadonlyMap<string, string>,
): Map<string, ReleaseDate> {
  const dates = new Map<string, ReleaseDate>();
  let newer: string | undefined;
  for (const { version } of sections) {
    const published = npm.get(version);
    if (published) {
      newer = new Date(published).toISOString();
      dates.set(version, { publishedAt: newer, dateSource: "npm" });
    } else if (newer) {
      dates.set(version, { publishedAt: newer, dateSource: "estimated" });
    }
  }
  return dates;
}

export interface IngestPlan {
  /** Release records to write: new versions and past versions whose text changed. */
  write: Release[];
  newVersions: string[];
  changedVersions: string[];
  /** New versions with no date yet; written on a later run. */
  undated: string[];
}

/** Decides what an ingest run writes. A changed past release keeps its original date. */
export function planIngest(
  sections: readonly ChangelogSection[],
  existing: ReadonlyMap<string, Release>,
  dates: ReadonlyMap<string, ReleaseDate>,
  run: { sourceCommit: string; fetchedAt: string },
): IngestPlan {
  const plan: IngestPlan = { write: [], newVersions: [], changedVersions: [], undated: [] };
  for (const section of sections) {
    const old = existing.get(section.version);
    if (old) {
      if (old.sourceHash === sha256(section.rawMarkdown)) continue;
      plan.changedVersions.push(section.version);
      plan.write.push(
        toRelease(section, { ...run, publishedAt: old.publishedAt, dateSource: old.dateSource }),
      );
      continue;
    }
    const date = dates.get(section.version);
    if (!date) {
      plan.undated.push(section.version);
      continue;
    }
    plan.newVersions.push(section.version);
    plan.write.push(toRelease(section, { ...run, ...date }));
  }
  return plan;
}

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

async function main() {
  const { values } = parseArgs({
    options: {
      commit: { type: "string" },
      content: { type: "string", default: "../content" },
    },
  });
  const root = values.content;
  const startedAt = new Date().toISOString();
  const sourceCommit = values.commit ?? (await latestCommit());
  const sections = parseChangelog(await fetchChangelog(sourceCommit));
  const existing = new Map(
    (await readCollection(root, "releases")).map((f) => {
      const r = Release.parse(f.data);
      return [r.version, r] as const;
    }),
  );

  const dates = releaseDates(sections, await fetchPublishDates());
  const plan = planIngest(sections, existing, dates, { sourceCommit, fetchedAt: startedAt });

  await mkdir(join(root, "releases"), { recursive: true });
  for (const release of plan.write) {
    await writeFile(join(root, "releases", `${release.version}.json`), json(release));
  }
  if (plan.write.length > 0) {
    const run = IngestRun.parse({
      id: `${startedAt.slice(0, 10)}-${sourceCommit.slice(0, 7)}`,
      startedAt,
      sourceCommit,
      newVersions: plan.newVersions,
      changedVersions: plan.changedVersions,
      status: "ok",
      errors: [],
    });
    await mkdir(join(root, "runs"), { recursive: true });
    await writeFile(join(root, "runs", `${run.id}.json`), json(run));
  }

  const estimated = plan.write.filter((r) => r.dateSource === "estimated").map((r) => r.version);
  console.log(
    `${sourceCommit}: ${plan.newVersions.length} new, ${plan.changedVersions.length} changed`,
  );
  if (estimated.length) console.log(`estimated dates (not on npm): ${estimated.join(", ")}`);
  if (plan.undated.length) console.log(`waiting for npm: ${plan.undated.join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
