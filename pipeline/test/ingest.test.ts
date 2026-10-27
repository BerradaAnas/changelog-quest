import { describe, expect, it } from "vitest";
import { planIngest, releaseDates } from "../src/ingest.ts";
import { publishDates } from "../src/npm.ts";
import { parseChangelog, toRelease } from "../src/parse-changelog.ts";

const md = (b = "Fixed sample B") =>
  `# Changelog\n\n## 1.0.3\n\n- Added sample D\n\n## 1.0.2\n\n- Added sample C\n\n## 1.0.1\n\n- Added sample A\n- ${b}\n\n## 1.0.0\n\n- First\n`;
const run = { sourceCommit: "c".repeat(40), fetchedAt: "2026-01-05T00:00:00.000Z" };
const npm = publishDates({
  created: "2026-01-01T00:00:00.000Z",
  modified: "2026-01-04T00:00:00.000Z",
  "1.0.2": "2026-01-03T00:00:00.000Z",
  "1.0.0": "2026-01-01T00:00:00.000Z",
  "1.0.9-beta.1": "2026-01-04T00:00:00.000Z",
});

describe("publishDates", () => {
  it("keeps versions only", () => {
    expect([...npm.keys()]).toEqual(["1.0.2", "1.0.0", "1.0.9-beta.1"]);
  });
});

describe("releaseDates", () => {
  it("estimates missing versions from the next newer published one", () => {
    const dates = releaseDates(parseChangelog(md()), npm);
    expect(dates.get("1.0.3")).toBeUndefined();
    expect(dates.get("1.0.2")).toEqual({
      publishedAt: "2026-01-03T00:00:00.000Z",
      dateSource: "npm",
    });
    expect(dates.get("1.0.1")).toEqual({
      publishedAt: "2026-01-03T00:00:00.000Z",
      dateSource: "estimated",
    });
    expect(dates.get("1.0.0")?.dateSource).toBe("npm");
  });
});

describe("planIngest", () => {
  it("writes dated new versions and waits for undated ones", () => {
    const sections = parseChangelog(md());
    const plan = planIngest(sections, new Map(), releaseDates(sections, npm), run);
    expect(plan.newVersions).toEqual(["1.0.2", "1.0.1", "1.0.0"]);
    expect(plan.undated).toEqual(["1.0.3"]);
    expect(plan.write.map((r) => r.version)).toEqual(plan.newVersions);
  });

  it("skips unchanged releases and rewrites edited ones with their original date", () => {
    const first = parseChangelog(md());
    const dates = releaseDates(first, npm);
    const existing = new Map(
      planIngest(first, new Map(), dates, run).write.map((r) => [r.version, r]),
    );
    const edited = parseChangelog(md("Fixed sample B properly"));
    const plan = planIngest(edited, existing, new Map(), run);
    expect(plan.newVersions).toEqual([]);
    expect(plan.changedVersions).toEqual(["1.0.1"]);
    expect(plan.undated).toEqual(["1.0.3"]);
    const [changed] = plan.write;
    expect(changed?.publishedAt).toBe(existing.get("1.0.1")?.publishedAt);
    expect(changed?.dateSource).toBe("estimated");
    expect(changed?.items[1]?.id).not.toBe(existing.get("1.0.1")?.items[1]?.id);
  });

  it("matches what toRelease builds", () => {
    const [section] = parseChangelog(md()).slice(1);
    if (!section) throw new Error("no section");
    const plan = planIngest([section], new Map(), releaseDates([section], npm), run);
    expect(plan.write[0]).toEqual(
      toRelease(section, { ...run, publishedAt: "2026-01-03T00:00:00.000Z", dateSource: "npm" }),
    );
  });
});
