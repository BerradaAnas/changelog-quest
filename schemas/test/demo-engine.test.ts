import { describe, expect, it } from "vitest";
import { configPreviewPlaceholders, renderConfigPreview, runDemo } from "../src/index.ts";
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

describe("config preview", () => {
  it("fills placeholders as plain text", () => {
    expect(renderConfigPreview('{ "command": "{{command}}" }', { command: "<b>" })).toBe(
      '{ "command": "<b>" }',
    );
    expect(configPreviewPlaceholders("{{a}} {{ b }}")).toEqual(["a", "b"]);
  });
});
