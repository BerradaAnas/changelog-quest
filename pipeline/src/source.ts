import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Release, ReleaseSummary } from "@cq/schemas";
import { config } from "./config.ts";
import { readCollection } from "./content.ts";
import { changeItemIds, sha256 } from "./ids.ts";
import { type ChangelogSection, parseChangelog } from "./parse-changelog.ts";
import { closeLines } from "./wording.ts";

/**
 * Access to the upstream changelog text. It is read at run time and never written to the
 * repository or the site (ADR 0008).
 */

export async function latestCommit(): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${config.changelogRepo}/commits/HEAD`, {
    headers: { accept: "application/vnd.github.sha" },
  });
  if (!res.ok) throw new Error(`GitHub API: ${res.status} ${res.statusText}`);
  return (await res.text()).trim();
}

export async function fetchChangelog(commit: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${config.changelogRepo}/${commit}/${config.changelogPath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

/** Checks stored releases against the upstream text they were ingested from. */
export function verifyReleases(releases: readonly Release[], markdown: string): string[] {
  const sections = new Map(parseChangelog(markdown).map((s) => [s.version, s]));
  const problems: string[] = [];
  for (const r of releases) {
    const section = sections.get(r.version);
    if (!section) {
      problems.push(`${r.version}: not in the changelog at ${r.sourceCommit}`);
      continue;
    }
    if (sha256(section.rawMarkdown) !== r.sourceHash)
      problems.push(`${r.version}: sourceHash differs`);
    const expected = changeItemIds(r.version, section.bullets);
    const stored = r.items.map((i) => i.id);
    if (expected.join() !== stored.join()) problems.push(`${r.version}: item ids differ`);
  }
  return problems;
}

/** Lines this close to the upstream wording are reported as copies. */
export const WORDING_THRESHOLD = 0.8;

async function loadReleases(root: string): Promise<Release[]> {
  return (await readCollection(root, "releases")).map((f) => Release.parse(f.data));
}

async function show(root: string, version: string): Promise<void> {
  let commit: string;
  try {
    const file = await readFile(join(root, "releases", `${version}.json`), "utf8");
    commit = Release.parse(JSON.parse(file)).sourceCommit;
  } catch {
    commit = await latestCommit();
  }
  const section: ChangelogSection | undefined = parseChangelog(await fetchChangelog(commit)).find(
    (s) => s.version === version,
  );
  if (!section) throw new Error(`${version} is not in the changelog at ${commit}`);
  const ids = changeItemIds(version, section.bullets);
  console.log(`${version} @ ${commit} (upstream text, for review only; do not copy it)\n`);
  for (const [n, text] of section.bullets.entries()) console.log(`${ids[n]}  ${text}`);
}

async function verify(root: string): Promise<number> {
  const byCommit = Map.groupBy(await loadReleases(root), (r) => r.sourceCommit);
  let problems = 0;
  for (const [commit, releases] of byCommit) {
    for (const p of verifyReleases(releases, await fetchChangelog(commit))) {
      console.log(`✗ ${p}`);
      problems++;
    }
  }
  console.log(`${problems} problem(s) in ${byCommit.size} upstream commit(s)`);
  return problems;
}

/** Lists summary lines worded too close to the upstream bullets (ADR 0008). */
async function wording(root: string, versions: string[], threshold: number): Promise<number> {
  const releases = new Map((await loadReleases(root)).map((r) => [r.version, r]));
  const summaries = (await readCollection(root, "summaries"))
    .map((f) => ReleaseSummary.parse(f.data))
    .filter((s) => versions.length === 0 || versions.includes(s.version));
  const texts = new Map<string, string>();
  let close = 0;
  for (const summary of summaries) {
    const release = releases.get(summary.version);
    if (!release || release.sourceHash !== summary.sourceHash) continue;
    if (!texts.has(release.sourceCommit))
      texts.set(release.sourceCommit, await fetchChangelog(release.sourceCommit));
    const section = parseChangelog(texts.get(release.sourceCommit) ?? "").find(
      (s) => s.version === summary.version,
    );
    if (!section) continue;
    const ids = changeItemIds(summary.version, section.bullets);
    const bullets = new Map(ids.map((id, n) => [id, section.bullets[n] ?? ""]));
    for (const line of closeLines(summary, bullets, threshold)) {
      console.log(
        `✗ ${summary.version} line ${line.index + 1} (${line.score.toFixed(2)}): ${line.text}`,
      );
      close++;
    }
  }
  console.log(`${close} line(s) at or above ${threshold} in ${summaries.length} summaries`);
  return close;
}

async function main() {
  const [command, arg, ...rest] = process.argv.slice(2);
  const root = process.env.CONTENT_DIR ?? "../content";
  if (command === "show" && arg) await show(root, arg);
  else if (command === "verify") process.exitCode = (await verify(root)) > 0 ? 1 : 0;
  else if (command === "wording") {
    const versions = [arg, ...rest].filter((v): v is string => Boolean(v));
    process.exitCode = (await wording(root, versions, WORDING_THRESHOLD)) > 0 ? 1 : 0;
  } else {
    console.error(
      "usage: pnpm source show <version> | pnpm source verify | pnpm source wording [version...]",
    );
    process.exitCode = 2;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
