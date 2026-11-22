import type { Demo, Feature, Release, ReleaseSummary } from "@cq/schemas";
import { describe, expect, it } from "vitest";
import { featureView, freshness, freshnessReference, newFeatures } from "../src/lib/features.ts";

const release = (version: string, day: string): Release => ({
  version,
  publishedAt: `2026-01-${day}T00:00:00.000Z`,
  dateSource: "npm",
  sourceUrl: "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md",
  sourceCommit: "b".repeat(40),
  sourceHash: "a".repeat(64),
  fetchedAt: "2026-02-01T00:00:00.000Z",
  items: [
    { id: `${version}#11111111`, position: 0 },
    { id: `${version}#22222222`, position: 1 },
  ],
});
const summary = (version: string, status: "draft" | "approved" = "approved"): ReleaseSummary => ({
  version,
  sourceHash: "a".repeat(64),
  title: "Sample",
  headline: "Sample headline.",
  lines: [
    { kind: "changed", text: "Hooks sample line.", covers: [`${version}#11111111`] },
    { kind: "fixed", text: "Unrelated sample line.", covers: [`${version}#22222222`] },
  ],
  classifications: {
    [`${version}#11111111`]: { kind: "changed", featureIds: ["hooks"] },
    [`${version}#22222222`]: { kind: "fixed", featureIds: [] },
  },
  status,
  model: "test-model",
  promptVersion: "draft-summary-v1",
  generatedAt: "2026-02-02T00:00:00.000Z",
  ...(status === "approved" ? { approvedAt: "2026-02-03T00:00:00.000Z" } : {}),
});
const feature = (over: Partial<Feature> = {}): Feature => ({
  id: "hooks",
  name: "Hooks",
  area: "extend",
  summary: "Sample summary.",
  what: "Sample description.",
  impact: [],
  howItWorks: [],
  docUrls: ["https://example.com/docs"],
  status: "active",
  events: [{ version: "1.0.1", type: "introduced", note: "Sample note." }],
  ...over,
});
const demo = (status: "draft" | "approved"): Demo => ({
  featureId: "hooks",
  title: "Sample demo",
  intro: "Sample intro.",
  kind: "type",
  inputs: [{ id: "command", label: "Command" }],
  rules: [
    {
      when: [{ input: "command", equals: "x" }],
      show: { title: "T", detail: "D", outcome: "info", trace: [] },
    },
  ],
  fallback: { title: "F", detail: "D" },
  quiz: { question: "Q", options: ["a", "b"], answerIndex: 0, explanation: "E" },
  status,
});
const releases = new Map(["1.0.1", "1.0.2", "1.0.3"].map((v, n) => [v, release(v, `0${n + 1}`)]));
const ctx = (over = {}) => ({
  releases,
  summaries: new Map<string, ReleaseSummary>(),
  demos: new Map<string, Demo>(),
  ...over,
});

describe("featureView", () => {
  it("builds history from events and linked summary lines, newest first", () => {
    const summaries = new Map([
      ["1.0.3", summary("1.0.3")],
      ["1.0.1", summary("1.0.1")],
    ]);
    const view = featureView(feature(), ctx({ summaries }));
    expect(view.introducedIn).toBe("1.0.1");
    expect(view.history.map((h) => h.version)).toEqual(["1.0.3", "1.0.1"]);
    expect(view.history[0]).toMatchObject({
      events: [],
      lines: [{ kind: "changed", text: "Hooks sample line." }],
    });
    expect(view.history[1]?.events).toEqual([{ type: "introduced", note: "Sample note." }]);
    expect(view.history[1]?.lines).toHaveLength(1);
  });

  it("ignores draft and stale summaries unless drafts are included", () => {
    const stale = { ...summary("1.0.3"), sourceHash: "c".repeat(64) };
    const summaries = new Map([
      ["1.0.2", summary("1.0.2", "draft")],
      ["1.0.3", stale],
    ]);
    expect(featureView(feature(), ctx({ summaries })).history.map((h) => h.version)).toEqual([
      "1.0.1",
    ]);
    const preview = featureView(feature(), ctx({ summaries, includeDrafts: true }));
    expect(preview.history.map((h) => h.version)).toEqual(["1.0.2", "1.0.1"]);
  });

  it("shows a demo only once approved", () => {
    const draft = new Map([["hooks", demo("draft")]]);
    expect(featureView(feature(), ctx({ demos: draft })).demo).toBeUndefined();
    expect(featureView(feature(), ctx({ demos: draft, includeDrafts: true })).demo).toBeDefined();
    const approved = new Map([["hooks", demo("approved")]]);
    expect(featureView(feature(), ctx({ demos: approved })).demo?.title).toBe("Sample demo");
  });
});

describe("freshness", () => {
  const dated = new Map([
    ["1.0.1", { ...release("1.0.1", "01"), publishedAt: "2026-01-01T00:00:00.000Z" }],
    ["1.0.2", { ...release("1.0.2", "01"), publishedAt: "2026-02-20T00:00:00.000Z" }],
    ["1.0.3", { ...release("1.0.3", "01"), publishedAt: "2026-03-01T00:00:00.000Z" }],
  ]);
  const view = (events: Feature["events"], id = "hooks") =>
    featureView(feature({ id, events }), ctx({ releases: dated }));
  const reference = freshnessReference(dated.values());

  it("measures from the newest release", () => {
    expect(reference).toBe("2026-03-01T00:00:00.000Z");
    expect(freshnessReference([])).toBeUndefined();
  });

  it("marks features introduced within 30 days as new", () => {
    const v = view([{ version: "1.0.2", type: "introduced", note: "N." }]);
    expect(v.introducedAt).toBe("2026-02-20T00:00:00.000Z");
    expect(freshness(v, reference)).toBe("new");
  });

  it("marks older features updated within 30 days as updated", () => {
    const v = view([
      { version: "1.0.1", type: "introduced", note: "N." },
      { version: "1.0.3", type: "updated", note: "U." },
    ]);
    expect(v.updatedAt).toBe("2026-03-01T00:00:00.000Z");
    expect(freshness(v, reference)).toBe("updated");
  });

  it("leaves older features unmarked", () => {
    expect(freshness(view(feature().events), reference)).toBeUndefined();
    expect(freshness(view(feature().events), undefined)).toBeUndefined();
  });

  it("lists new features newest first", () => {
    const a = view([{ version: "1.0.2", type: "introduced", note: "N." }], "a");
    const b = view([{ version: "1.0.3", type: "introduced", note: "N." }], "b");
    const old = view(feature().events, "old");
    expect(newFeatures([a, old, b], reference).map((v) => v.feature.id)).toEqual(["b", "a"]);
  });
});
