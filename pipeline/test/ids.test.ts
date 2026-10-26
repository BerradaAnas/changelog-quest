import { describe, expect, it } from "vitest";
import { changeItemIds, normalizeBullet } from "../src/ids.ts";

describe("changeItemIds", () => {
  it("is stable when bullets are inserted or reordered", () => {
    const [a, b] = changeItemIds("2.0.14", ["Added hooks", "Fixed a crash"]);
    const after = changeItemIds("2.0.14", ["New bullet", "Fixed a crash", "Added hooks"]);
    expect(after[1]).toBe(b);
    expect(after[2]).toBe(a);
  });

  it("ignores whitespace differences", () => {
    expect(normalizeBullet("  Added\n  hooks ")).toBe("Added hooks");
    expect(changeItemIds("1.0.0", ["Added  hooks"])).toEqual(
      changeItemIds("1.0.0", ["Added hooks"]),
    );
  });

  it("disambiguates repeated bullets", () => {
    const [first, second] = changeItemIds("1.0.0", ["Bug fixes", "Bug fixes"]);
    expect(second).toBe(`${first}-2`);
    expect(first).toMatch(/^1\.0\.0#[0-9a-f]{8}$/);
  });
});
