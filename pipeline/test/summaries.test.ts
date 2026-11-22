import type { Release, ReleaseSummary } from "@cq/schemas";
import { describe, expect, it } from "vitest";
import {
  type BatchLimits,
  buildSummary,
  pendingSummaries,
  type SummaryDraft,
} from "../src/summaries.ts";

const release = (version: string, day: string, items = 2, hash = "a"): Release => ({
  version,
  publishedAt: `2026-01-${day}T00:00:00.000Z`,
  dateSource: "npm",
  sourceUrl: "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md",
  sourceCommit: "b".repeat(40),
  sourceHash: hash.repeat(64),
  fetchedAt: "2026-02-01T00:00:00.000Z",
  items: Array.from({ length: items }, (_, n) => ({
    id: `${version}#${String(n + 1).repeat(8)}`,
    position: n,
  })),
});
const meta = {
  model: "test-model",
  promptVersion: "draft-summary-v1",
  generatedAt: "2026-02-02T00:00:00.000Z",
};
const draft = (): SummaryDraft => ({
  version: "1.0.2",
  title: "Sample title",
  headline: "A sample headline.",
  lines: [
    { kind: "added", text: "Adds a sample thing.", covers: ["11111111"], featureIds: ["hooks"] },
    { kind: "fixed", text: "Fixes two sample bugs.", covers: ["1.0.2#22222222", "11111111"] },
  ],
});

describe("pendingSummaries", () => {
  const releases = [release("1.0.1", "01"), release("1.0.3", "03", 4), release("1.0.2", "02", 3)];
  const none = new Map<string, ReleaseSummary>();
  const versions = (limits: BatchLimits, summaries = none) =>
    pendingSummaries(releases, summaries, limits).map((r) => r.version);

  it("lists releases newest first up to the release limit", () => {
    expect(versions({ releases: 2, items: 100 })).toEqual(["1.0.3", "1.0.2"]);
  });

  it("stops before the item limit but always returns one release", () => {
    expect(versions({ releases: 20, items: 7 })).toEqual(["1.0.3", "1.0.2"]);
    expect(versions({ releases: 20, items: 1 })).toEqual(["1.0.3"]);
  });

  it("skips current summaries and returns releases whose source changed", () => {
    const current = buildSummary(release("1.0.2", "02"), draft(), meta);
    expect(versions({ releases: 20, items: 100 }, new Map([["1.0.2", current]]))).toEqual([
      "1.0.3",
      "1.0.1",
    ]);
    const stale = { ...current, sourceHash: "c".repeat(64) };
    expect(versions({ releases: 20, items: 100 }, new Map([["1.0.2", stale]]))).toContain("1.0.2");
  });

  it("leaves out releases before the cut-off unless their summary went stale", () => {
    const cutoff = "2026-01-02T00:00:00.000Z";
    expect(versions({ releases: 20, items: 100, cutoff })).toEqual(["1.0.3", "1.0.2"]);
    const oldDraft: SummaryDraft = {
      ...draft(),
      version: "1.0.1",
      lines: [{ kind: "fixed", text: "Fixes a sample bug.", covers: ["11111111", "22222222"] }],
    };
    const old = buildSummary(release("1.0.1", "01"), oldDraft, meta);
    const stale = new Map([["1.0.1", { ...old, sourceHash: "c".repeat(64) }]]);
    expect(versions({ releases: 20, items: 100, cutoff }, stale)).toEqual([
      "1.0.3",
      "1.0.2",
      "1.0.1",
    ]);
  });
});

describe("buildSummary", () => {
  it("expands short ids and derives classifications from the covering lines", () => {
    const s = buildSummary(release("1.0.2", "02"), draft(), meta);
    expect(s.status).toBe("draft");
    expect(s.sourceHash).toBe("a".repeat(64));
    expect(s.lines[0]?.covers).toEqual(["1.0.2#11111111"]);
    expect(s.classifications).toEqual({
      "1.0.2#11111111": { kind: "added", featureIds: ["hooks"] },
      "1.0.2#22222222": { kind: "fixed", featureIds: [] },
    });
    expect(s.model).toBe("test-model");
  });

  it("rejects a draft that leaves an item uncovered or covers an unknown one", () => {
    const missing = { ...draft(), lines: draft().lines.slice(0, 1) };
    expect(() => buildSummary(release("1.0.2", "02"), missing, meta)).toThrow(/not covered/);
    const unknown = draft();
    unknown.lines[0]?.covers.push("99999999");
    expect(() => buildSummary(release("1.0.2", "02"), unknown, meta)).toThrow(/unknown item/);
  });

  it("classifies minor items without a line, and rejects ones a line also covers", () => {
    const d: SummaryDraft = {
      ...draft(),
      lines: [{ kind: "added", text: "Adds a sample thing.", covers: ["11111111"] }],
      minor: { fixed: ["22222222"] },
    };
    const s = buildSummary(release("1.0.2", "02"), d, meta);
    expect(s.classifications["1.0.2#22222222"]).toEqual({
      kind: "fixed",
      featureIds: [],
      minor: true,
    });
    const both = { ...d, minor: { fixed: ["11111111", "22222222"] } };
    expect(() => buildSummary(release("1.0.2", "02"), both, meta)).toThrow(/also covered/);
  });

  it("rejects a draft written for another version", () => {
    expect(() => buildSummary(release("1.0.3", "03"), draft(), meta)).toThrow(/draft is for/);
  });
});
