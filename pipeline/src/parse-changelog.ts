import { Release } from "@cq/schemas";
import { config } from "./config.ts";
import { changeItemIds, sha256 } from "./ids.ts";

export interface ChangelogSection {
  version: string;
  /** The section exactly as written, from its heading to the last bullet, ending in "\n". */
  rawMarkdown: string;
  /** Bullet texts in order, without the "- " marker; wrapped lines joined with a space. */
  bullets: string[];
}

export class ChangelogParseError extends Error {
  constructor(readonly problems: string[]) {
    super(`CHANGELOG.md could not be parsed:\n${problems.map((p) => `  ${p}`).join("\n")}`);
  }
}

const TITLE = /^# Changelog\s*$/;
const HEADING = /^## (\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\s*$/;
const BULLET = /^- (.*\S)\s*$/;
const CONTINUATION = /^ {2,}(?![-*+] )(\S.*?)\s*$/;

/**
 * Splits CHANGELOG.md into version sections, newest first as in the file.
 * Strict on purpose: any line it doesn't recognise (nested lists, prose, other headings) fails
 * the whole parse, so a format change upstream stops ingestion instead of losing text.
 */
export function parseChangelog(markdown: string): ChangelogSection[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const problems: string[] = [];
  const sections: (ChangelogSection & { lines: string[] })[] = [];
  const seen = new Set<string>();

  lines.forEach((line, n) => {
    const at = `line ${n + 1}`;
    const current = sections.at(-1);
    const heading = HEADING.exec(line);
    if (heading) {
      const version = heading[1] as string;
      if (seen.has(version)) problems.push(`${at}: version ${version} appears twice`);
      seen.add(version);
      sections.push({ version, rawMarkdown: "", bullets: [], lines: [line] });
      return;
    }
    if (line.trim() === "") {
      current?.lines.push(line);
      return;
    }
    if (!current) {
      if (!TITLE.test(line)) problems.push(`${at}: unexpected text before the first version`);
      return;
    }
    const bullet = BULLET.exec(line);
    if (bullet) {
      current.bullets.push(bullet[1] as string);
      current.lines.push(line);
      return;
    }
    const continuation = CONTINUATION.exec(line);
    const previous = current.lines.at(-1) ?? "";
    if (continuation && current.bullets.length > 0 && previous.trim() !== "") {
      const last = current.bullets.length - 1;
      current.bullets[last] = `${current.bullets[last]} ${continuation[1]}`;
      current.lines.push(line);
      return;
    }
    problems.push(
      `${at}: unexpected line in ${current.version}: ${JSON.stringify(line.slice(0, 80))}`,
    );
  });

  for (const s of sections) {
    if (s.bullets.length === 0) problems.push(`version ${s.version} has no bullets`);
  }
  if (sections.length === 0) problems.push("no version sections found");
  if (problems.length > 0) throw new ChangelogParseError(problems);

  return sections.map(({ version, bullets, lines: sectionLines }) => {
    while (sectionLines.at(-1)?.trim() === "") sectionLines.pop();
    return { version, bullets, rawMarkdown: `${sectionLines.join("\n")}\n` };
  });
}

/** GitHub's heading anchor for "## 2.0.14" is "#2014". */
export const sectionUrl = (commit: string, version: string): string =>
  `https://github.com/${config.changelogRepo}/blob/${commit}/${config.changelogPath}#${version.replace(/[^0-9A-Za-z-]/g, "").toLowerCase()}`;

export interface ReleaseSource {
  sourceCommit: string;
  publishedAt: string;
  fetchedAt: string;
}

/**
 * Builds the ingested Release record for one section, validated against the schema.
 * The upstream wording stays in memory: only its hash and the item ids are kept (ADR 0008).
 */
export function toRelease(section: ChangelogSection, source: ReleaseSource): Release {
  const ids = changeItemIds(section.version, section.bullets);
  return Release.parse({
    version: section.version,
    publishedAt: source.publishedAt,
    sourceUrl: sectionUrl(source.sourceCommit, section.version),
    sourceCommit: source.sourceCommit,
    sourceHash: sha256(section.rawMarkdown),
    fetchedAt: source.fetchedAt,
    items: ids.map((id, position) => ({ id, position })),
  });
}
