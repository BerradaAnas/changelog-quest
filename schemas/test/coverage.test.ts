import { describe, expect, it } from "vitest";
import { checkSummary, MAX_COVERS_PER_LINE } from "../src/index.ts";
import { release, summary } from "./fixtures.ts";

const errors = (s = summary(), r = release()) =>
  checkSummary(r, s).filter((i) => i.level === "error");

describe("checkSummary", () => {
  it("passes a complete summary", () => {
    expect(checkSummary(release(), summary())).toEqual([]);
  });

  it("flags uncovered items", () => {
    const s = summary();
    s.lines = s.lines.slice(0, 1);
    expect(errors(s).map((i) => i.message)).toContain(
      "item 2.0.14#22222222 is not covered by any line",
    );
  });

  it("accepts minor items without a line, but not added or removed ones (ADR 0016)", () => {
    const s = summary();
    s.lines = s.lines.slice(0, 1);
    s.classifications["2.0.14#22222222"] = { kind: "fixed", featureIds: [], minor: true };
    expect(errors(s)).toEqual([]);
    s.classifications["2.0.14#22222222"] = { kind: "added", featureIds: [], minor: true };
    expect(errors(s).map((i) => i.message)).toEqual([
      "item 2.0.14#22222222 is added and can't be minor; give it a line",
    ]);
  });

  it("warns about added items with no feature unless marked noFeature (ADR 0017)", () => {
    const s = summary();
    s.classifications["2.0.14#11111111"] = { kind: "added", featureIds: [] };
    expect(checkSummary(release(), s)).toEqual([
      {
        level: "warning",
        message:
          "item 2.0.14#11111111 adds something but links no feature: link one, add the feature, or mark it noFeature",
      },
    ]);
    s.classifications["2.0.14#11111111"] = { kind: "added", featureIds: [], noFeature: true };
    expect(checkSummary(release(), s)).toEqual([]);
  });

  it("allows noFeature only on added items with no feature", () => {
    const s = summary();
    s.classifications["2.0.14#11111111"] = { kind: "fixed", featureIds: [], noFeature: true };
    s.classifications["2.0.14#22222222"] = {
      kind: "added",
      featureIds: ["hooks"],
      noFeature: true,
    };
    expect(errors(s).map((i) => i.message)).toEqual([
      "item 2.0.14#11111111 is fixed; only added items can be noFeature",
      "item 2.0.14#22222222 is noFeature but links a feature",
    ]);
  });

  it("flags minor items that are also covered by a line", () => {
    const s = summary();
    s.classifications["2.0.14#22222222"] = { kind: "fixed", featureIds: [], minor: true };
    expect(errors(s).map((i) => i.message)).toEqual([
      "item 2.0.14#22222222 is minor but also covered by a line",
    ]);
  });

  it("flags invented items", () => {
    const s = summary();
    s.lines[0]!.covers.push("2.0.14#99999999");
    expect(errors(s)).toHaveLength(1);
  });

  it("flags missing and unknown classifications", () => {
    const s = summary();
    delete s.classifications["2.0.14#11111111"];
    s.classifications["2.0.14#99999999"] = { kind: "other", featureIds: [] };
    expect(errors(s)).toHaveLength(2);
  });

  it("reports a summary written against an older release text once, as a warning", () => {
    const r = release();
    r.sourceHash = "c".repeat(64);
    r.items = [{ id: "2.0.14#33333333", position: 0 }];
    for (const s of [summary(), { ...summary(), status: "draft" as const }]) {
      const issues = checkSummary(r, s);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ level: "warning" });
      expect(issues[0]?.message).toMatch(/hidden until redrafted/);
    }
  });

  it("warns on lines that cover too much", () => {
    const r = release();
    const s = summary();
    for (let n = 0; n < MAX_COVERS_PER_LINE; n++) {
      const id = `2.0.14#3333333${n}`;
      r.items.push({ id, position: n + 2 });
      s.classifications[id] = { kind: "fixed", featureIds: [] };
      s.lines[1]!.covers.push(id);
    }
    const issues = checkSummary(r, s);
    expect(issues).toEqual([{ level: "warning", message: expect.stringContaining("line 2") }]);
  });
});
