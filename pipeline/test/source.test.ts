import { describe, expect, it } from "vitest";
import { parseChangelog, toRelease } from "../src/parse-changelog.ts";
import { verifyReleases } from "../src/source.ts";

const COMMIT = "c".repeat(40);
const v1 = "# Changelog\n\n## 1.0.1\n\n- Added sample A\n- Fixed sample B\n\n## 1.0.0\n\n- First\n";
const source = {
  sourceCommit: COMMIT,
  publishedAt: "2026-01-01T00:00:00Z",
  fetchedAt: "2026-01-02T00:00:00Z",
};
const releases = parseChangelog(v1).map((s) => toRelease(s, source));

describe("verifyReleases", () => {
  it("accepts releases that match upstream", () => {
    expect(verifyReleases(releases, v1)).toEqual([]);
  });

  it("reports edited, reworded and missing sections", () => {
    const edited = v1
      .replace("Fixed sample B", "Fixed sample B again")
      .replace("## 1.0.0\n\n- First\n", "");
    expect(verifyReleases(releases, `${edited}## 0.9.0\n\n- Older\n`)).toEqual([
      "1.0.1: sourceHash differs",
      "1.0.1: item ids differ",
      `1.0.0: not in the changelog at ${COMMIT}`,
    ]);
  });
});
