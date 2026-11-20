import { describe, expect, it } from "vitest";
import {
  ChangeItemId,
  compareVersions,
  Demo,
  Feature,
  introducedIn,
  Release,
  ReleaseSummary,
} from "../src/index.ts";
import { demo, feature, release, summary } from "./fixtures.ts";

describe("compareVersions", () => {
  it("orders numerically and puts pre-releases first", () => {
    const sorted = ["2.0.10", "2.0.9", "2.0.10-beta.1", "10.0.0"].sort(compareVersions);
    expect(sorted).toEqual(["2.0.9", "2.0.10-beta.1", "2.0.10", "10.0.0"]);
  });
});

describe("schemas", () => {
  it("accepts valid fixtures", () => {
    expect(Release.safeParse(release()).success).toBe(true);
    expect(ReleaseSummary.safeParse(summary()).success).toBe(true);
    expect(Feature.safeParse(feature()).success).toBe(true);
    expect(Demo.safeParse(demo()).success).toBe(true);
  });

  it("accepts only https links", () => {
    for (const url of ["javascript:alert(1)", "http://example.com/docs", "data:text/html,x"]) {
      expect(Feature.safeParse({ ...feature(), docUrls: [url] }).success).toBe(false);
      expect(Release.safeParse({ ...release(), sourceUrl: url }).success).toBe(false);
    }
  });

  it("rejects unknown keys", () => {
    expect(Release.safeParse({ ...release(), extra: 1 }).success).toBe(false);
  });

  it("validates change item ids", () => {
    expect(ChangeItemId.safeParse("2.0.14#0a1b2c3d").success).toBe(true);
    expect(ChangeItemId.safeParse("2.0.14#0a1b2c3d-2").success).toBe(true);
    expect(ChangeItemId.safeParse("2.0.14#3").success).toBe(false);
  });

  it("requires approvedAt on approved summaries", () => {
    const { approvedAt: _, ...rest } = summary();
    expect(ReleaseSummary.safeParse(rest).success).toBe(false);
    expect(ReleaseSummary.safeParse({ ...rest, status: "draft" }).success).toBe(true);
  });

  it("requires exactly one introduced event", () => {
    const f = feature();
    f.events.push({ version: "2.0.15", type: "introduced", note: "again" });
    expect(Feature.safeParse(f).success).toBe(false);
    expect(introducedIn(feature())).toBe("2.0.14");
  });

  it("checks demo conditions and quiz range", () => {
    const d = demo();
    d.rules[0]!.when[0] = { input: "command", equals: "x", matches: "y" };
    expect(Demo.safeParse(d).success).toBe(false);
    expect(Demo.safeParse({ ...demo(), quiz: { ...demo().quiz, answerIndex: 5 } }).success).toBe(
      false,
    );
  });
});
