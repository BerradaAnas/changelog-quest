import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Release } from "@cq/schemas";
import { config } from "./config.ts";
import { readCollection } from "./content.ts";
import { changeItemIds, sha256 } from "./ids.ts";
import { type ChangelogSection, parseChangelog } from "./parse-changelog.ts";

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

async function main() {
  const [command, arg] = process.argv.slice(2);
  const root = process.env.CONTENT_DIR ?? "../content";
  if (command === "show" && arg) await show(root, arg);
  else if (command === "verify") process.exitCode = (await verify(root)) > 0 ? 1 : 0;
  else {
    console.error("usage: pnpm source show <version> | pnpm source verify");
    process.exitCode = 2;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
