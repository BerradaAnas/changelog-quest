import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { changeItemIds, sha256 } from "../src/ids.ts";
import {
  ChangelogParseError,
  parseChangelog,
  sectionUrl,
  toRelease,
} from "../src/parse-changelog.ts";

const sample = await readFile(new URL("./fixtures/CHANGELOG.sample.md", import.meta.url), "utf8");
const COMMIT = "08c6a4f5121ae140d3c1b5c96e3e5ae53587b54b";

function problems(markdown: string): string[] {
  try {
    parseChangelog(markdown);
  } catch (e) {
    if (e instanceof ChangelogParseError) return e.problems;
    throw e;
  }
  return [];
}

describe("parseChangelog", () => {
  it("splits a changelog into sections, newest first", () => {
    const sections = parseChangelog(sample);
    expect(sections.map((s) => s.version)).toEqual(["9.1.2", "9.0.1", "9.0.0"]);
    expect(sections[0]?.bullets).toHaveLength(3);
    expect(sections[0]?.bullets[1]).toBe('Fixed a `"\\"` backslash vanishing from sample output');
    expect(sections[2]?.rawMarkdown).toBe("## 9.0.0\n\n- First sample release\n");
  });

  it("keeps each section's text exactly", () => {
    const [first] = parseChangelog(sample);
    expect(sample).toContain(first?.rawMarkdown.trimEnd());
  });

  it("gives the same result for CRLF line endings", () => {
    expect(parseChangelog(sample.replace(/\n/g, "\r\n"))).toEqual(parseChangelog(sample));
  });

  it("joins wrapped bullet lines", () => {
    const [s] = parseChangelog("## 1.0.0\n\n- Added a long\n  bullet that wraps\n- Next\n");
    expect(s?.bullets).toEqual(["Added a long bullet that wraps", "Next"]);
  });

  it("rejects anything it does not recognise", () => {
    expect(problems("## 1.0.0\n\n- Parent\n  - Nested\n")).toEqual([
      'line 4: unexpected line in 1.0.0: "  - Nested"',
    ]);
    expect(problems("## 1.0.0\n\nSome prose.\n- Item\n")).toHaveLength(1);
    expect(problems("## 1.0.0\n\n### Fixed\n- Item\n")).toHaveLength(1);
    expect(problems("## 1.0.0\n\n- Item\n\n  orphan continuation\n")).toHaveLength(1);
    expect(problems("Intro\n## 1.0.0\n- Item\n")).toEqual([
      "line 1: unexpected text before the first version",
    ]);
  });

  it("rejects duplicate, empty and missing sections", () => {
    expect(problems("## 1.0.0\n- A\n## 1.0.0\n- B\n")).toEqual([
      "line 3: version 1.0.0 appears twice",
    ]);
    expect(problems("## 1.0.1\n\n## 1.0.0\n- A\n")).toEqual(["version 1.0.1 has no bullets"]);
    expect(problems("# Changelog\n")).toEqual(["no version sections found"]);
  });
});

describe("toRelease", () => {
  it("builds a valid release with hashed ids", () => {
    const [section] = parseChangelog(sample);
    if (!section) throw new Error("no section");
    const release = toRelease(section, {
      sourceCommit: COMMIT,
      publishedAt: "2026-10-25T18:00:00Z",
      fetchedAt: "2026-10-26T06:00:00Z",
    });
    expect(release.sourceHash).toBe(sha256(section.rawMarkdown));
    expect(JSON.stringify(release)).not.toContain("sample");
    expect(release.items.map((i) => i.id)).toEqual(changeItemIds("9.1.2", section.bullets));
    expect(release.items.map((i) => i.position)).toEqual([0, 1, 2]);
    expect(release.sourceUrl).toBe(
      `https://github.com/anthropics/claude-code/blob/${COMMIT}/CHANGELOG.md#912`,
    );
  });

  it("builds GitHub anchors for pre-release versions", () => {
    expect(sectionUrl(COMMIT, "2.0.0-beta.1")).toMatch(/#200-beta1$/);
  });
});
