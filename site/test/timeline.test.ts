import type { Release, ReleaseSummary } from "@cq/schemas";
import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  compareVersions,
  summaryView,
  timelineStats,
  weekOf,
} from "../src/lib/timeline.ts";

const hash = (c: string) => c.repeat(64);

function release(version: string, publishedAt: string, items = 2, estimated = false): Release {
  return {
    version,
    publishedAt,
    dateSource: estimated ? "estimated" : "npm",
    sourceUrl: `https://github.com/anthropics/claude-code/blob/${"a".repeat(40)}/CHANGELOG.md#${version.replaceAll(".", "")}`,
    sourceCommit: "a".repeat(40),
    sourceHash: hash("b"),
    fetchedAt: "2026-10-27T00:00:00Z",
    items: Array.from({ length: items }, (_, n) => ({ id: `${version}#0000000${n}`, position: n })),
  };
}

function summary(version: string, status: "draft" | "approved" = "approved"): ReleaseSummary {
  return {
    version,
    sourceHash: hash("b"),
    title: `Title ${version}`,
    headline: "Headline.",
    lines: [
      { kind: "fixed", text: "A fix.", covers: [`${version}#00000001`] },
      { kind: "added", text: "A feature.", covers: [`${version}#00000000`] },
    ],
    classifications: {
      [`${version}#00000000`]: { kind: "added", featureIds: ["hooks"] },
      [`${version}#00000001`]: { kind: "fixed", featureIds: ["hooks"] },
    },
    status,
    model: "claude-haiku-5-5",
    promptVersion: "summary-v1",
    generatedAt: "2026-10-27T00:00:00Z",
    ...(status === "approved" ? { approvedAt: "2026-10-27T01:00:00Z" } : {}),
  };
}

describe("weekOf", () => {
  it("returns the UTC Monday", () => {
    expect(weekOf("2026-10-26T19:47:57.395Z")).toBe("2026-10-26"); // Monday
    expect(weekOf("2026-10-25T23:59:59Z")).toBe("2026-10-19"); // Sunday
    expect(weekOf("2026-10-01T08:00:00Z")).toBe("2026-09-28"); // week spanning two months
  });
});

describe("compareVersions", () => {
  it("orders numerically and puts pre-releases first", () => {
    const sorted = ["2.0.10", "2.0.9", "2.0.10-beta.1", "10.0.0"].sort(compareVersions);
    expect(sorted).toEqual(["2.0.9", "2.0.10-beta.1", "2.0.10", "10.0.0"]);
  });
});

describe("summaryView", () => {
  it("shows approved summaries grouped by kind in a fixed order", () => {
    const view = summaryView(release("1.0.0", "2026-01-01T00:00:00Z"), summary("1.0.0"));
    expect(view?.sections.map((s) => s.label)).toEqual(["Added", "Fixed"]);
    expect(view?.featureIds).toEqual(["hooks"]);
  });

  it("hides drafts and summaries of changed source text", () => {
    const r = release("1.0.0", "2026-01-01T00:00:00Z");
    expect(summaryView(r, summary("1.0.0", "draft"))).toBeUndefined();
    expect(summaryView({ ...r, sourceHash: hash("c") }, summary("1.0.0"))).toBeUndefined();
    expect(summaryView(r, undefined)).toBeUndefined();
  });
});

describe("buildTimeline", () => {
  const releases = [
    release("2.0.0", "2026-09-29T10:00:00Z"),
    release("2.0.2", "2026-10-01T10:00:00Z"),
    release("2.0.1", "2026-10-01T10:00:00Z", 3, true),
    release("1.9.0", "2026-09-10T10:00:00Z"),
  ];
  const months = buildTimeline(releases, new Map([["2.0.2", summary("2.0.2")]]));

  it("groups by week, newest first, ties broken by version", () => {
    expect(months.map((m) => m.month)).toEqual(["2026-10", "2026-09"]);
    expect(months[0]?.cards).toHaveLength(1);
    expect(months[0]?.cards[0]?.week).toBe("2026-09-28");
    expect(months[0]?.cards[0]?.entries.map((e) => e.version)).toEqual(["2.0.2", "2.0.1", "2.0.0"]);
    expect(months[1]?.cards[0]?.entries.map((e) => e.version)).toEqual(["1.9.0"]);
  });

  it("carries summaries, counts and estimated dates", () => {
    const [summarized, estimated] = months[0]?.cards[0]?.entries ?? [];
    expect(summarized?.summary?.title).toBe("Title 2.0.2");
    expect(estimated?.summary).toBeUndefined();
    expect(estimated?.estimated).toBe(true);
    expect(estimated?.itemCount).toBe(3);
    expect(timelineStats(months)).toEqual({ releases: 4, summarized: 1 });
  });
});
