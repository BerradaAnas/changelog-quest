import type { ReleaseSummary } from "@cq/schemas";
import { describe, expect, it } from "vitest";
import { closeLines, normalize, similarity } from "../src/wording.ts";

// Invented bullets in the upstream style; no real changelog text (ADR 0008).
const bullets = new Map([
  ["9.9.9#aaaaaaaa", "Fixed the `widget` panel flickering when the window is resized quickly"],
  ["9.9.9#bbbbbbbb", "Added a `--glow` flag that tints the prompt box"],
]);

const summary = (texts: string[]): ReleaseSummary => ({
  version: "9.9.9",
  sourceHash: "a".repeat(64),
  title: "Sample",
  headline: "Sample.",
  lines: texts.map((text, n) => ({
    kind: "fixed",
    text,
    covers: [n === 0 ? "9.9.9#aaaaaaaa" : "9.9.9#bbbbbbbb"],
  })),
  classifications: {},
  status: "draft",
  model: "test",
  promptVersion: "test",
  generatedAt: "2026-01-01T00:00:00Z",
});

describe("wording check", () => {
  it("normalizes code marks and the leading verb", () => {
    expect(normalize("Fixed the `widget` panel")).toBe("the widget panel");
    expect(normalize("[VSCode] Added a thing")).toBe("a thing");
  });

  it("scores identical text 1 and unrelated text low", () => {
    expect(similarity("abc", "abc")).toBe(1);
    expect(similarity("resize flicker is gone", "a new flag tints the prompt")).toBeLessThan(0.5);
  });

  it("flags a lightly edited copy and passes a real rewrite", () => {
    const s = summary([
      "The widget panel no longer flickers when the window is resized quickly.",
      "Pass --glow to give the prompt box a colored tint.",
    ]);
    const copy = summary([
      "The widget panel flickering when the window is resized quickly is fixed.",
    ]);
    expect(closeLines(copy, bullets, 0.8).map((l) => l.index)).toEqual([0]);
    expect(closeLines(s, bullets, 0.8).map((l) => l.index)).not.toContain(1);
  });
});
