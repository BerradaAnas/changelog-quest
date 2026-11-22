import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * WCAG AA contrast (4.5:1) for the text and background pairs the stylesheet uses, in both
 * palettes. The built-site check cannot measure colours, so the palette is tested here.
 */

const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");

function palette(block: string): Map<string, string> {
  return new Map(
    [...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6});/g)].map((m) => [m[1], m[2]]) as [
      string,
      string,
    ][],
  );
}
const light = palette(css.slice(css.indexOf(":root {"), css.indexOf("/* Dark palette")));
const dark = palette(css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf("* {")));

function luminance(hex: string): number {
  const channel = (n: number) => {
    const c = Number.parseInt(hex.slice(n, n + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS: [text: string, background: string][] = [
  ...["text", "text2", "muted", "faint", "accent-text"].flatMap((t) =>
    ["bg", "surface", "subtle"].map((b) => [t, b] as [string, string]),
  ),
  ["text2", "chip"],
  ["ok", "surface"],
  ["ok", "chip"],
  ["warn", "surface"],
  ["warn", "chip"],
  ["on-accent", "accent"],
  ["ok", "ok-bg"],
  ["bad", "bad-bg"],
  ["bad", "surface"],
  ["bad", "subtle"],
  ["accent-text", "info-bg"],
  ["text", "info-bg"],
  ["console-text", "console-bg"],
  ["console-dim", "console-bg"],
  ["console-accent", "console-bg"],
];

it("keeps the two copies of the dark palette identical", () => {
  const system = palette(
    css.slice(css.indexOf("/* Dark palette"), css.indexOf(':root[data-theme="dark"]')),
  );
  expect([...system]).toEqual([...dark]);
});

describe.each([
  ["light", light],
  ["dark", dark],
])("%s palette", (_, colors) => {
  it("defines every colour", () => {
    expect(colors.size).toBeGreaterThanOrEqual(13);
  });
  it.each(PAIRS)("%s on %s meets AA", (text, background) => {
    const ratio = contrast(colors.get(text) as string, colors.get(background) as string);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
