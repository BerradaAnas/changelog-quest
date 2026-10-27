import { describe, expect, it } from "vitest";
import {
  configPreviewPlaceholders,
  fillOutcome,
  outcomePlaceholders,
  renderConfigPreview,
  runDemo,
} from "../src/index.ts";
import { demo } from "./fixtures.ts";

describe("runDemo", () => {
  it("returns the first matching rule", () => {
    expect(runDemo(demo(), { command: "RM -rf /tmp" })?.title).toBe("Blocked");
  });

  it("compares equals trimmed and case-insensitively", () => {
    expect(runDemo(demo(), { command: "  LS " })?.title).toBe("Allowed");
  });

  it("returns null when nothing matches", () => {
    expect(runDemo(demo(), { command: "pwd" })).toBeNull();
    expect(runDemo(demo(), {})).toBeNull();
  });
});

describe("fillOutcome", () => {
  it("fills placeholders in title, detail and trace", () => {
    const outcome = {
      title: "Ran {{command}}",
      detail: "d",
      outcome: "info" as const,
      trace: [{ who: "Hook ({{event}})", text: "{{command}}", code: true }],
    };
    const filled = fillOutcome(outcome, { command: "ls", event: "Stop" });
    expect(filled.title).toBe("Ran ls");
    expect(filled.trace[0]).toEqual({ who: "Hook (Stop)", text: "ls", code: true });
    expect(outcomePlaceholders(outcome)).toEqual(["command", "event", "command"]);
  });
});

describe("config preview", () => {
  it("fills placeholders as plain text", () => {
    expect(renderConfigPreview('{ "command": "{{command}}" }', { command: "<b>" })).toBe(
      '{ "command": "<b>" }',
    );
    expect(configPreviewPlaceholders("{{a}} {{ b }}")).toEqual(["a", "b"]);
  });
});
