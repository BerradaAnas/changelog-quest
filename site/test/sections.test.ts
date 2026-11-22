import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { placeOf, SECTIONS } from "../src/lib/sections.ts";

const featureIds = readdirSync(new URL("../../content/features/", import.meta.url))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

describe("SECTIONS", () => {
  it("places every feature in exactly one section", () => {
    const listed = SECTIONS.flatMap((s) => s.featureIds);
    expect([...listed].sort()).toEqual([...featureIds].sort());
    expect(new Set(listed).size).toBe(listed.length);
  });
});

describe("placeOf", () => {
  const known = new Set(featureIds);
  it("finds the section and neighbours, across section boundaries", () => {
    const first = SECTIONS[0]?.featureIds[0] ?? "";
    expect(placeOf(first, known).prev).toBeUndefined();
    const lastOfFirst = SECTIONS[0]?.featureIds.at(-1) ?? "";
    expect(placeOf(lastOfFirst, known).next).toBe(SECTIONS[1]?.featureIds[0]);
    expect(placeOf("hooks", known).section?.id).toBe("build");
  });
});
