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

  it("blocks an approved summary when the source changed", () => {
    const r = release();
    r.sourceHash = "c".repeat(64);
    expect(errors(summary(), r)).toHaveLength(1);
    expect(errors({ ...summary(), status: "draft" }, r)).toHaveLength(0);
  });

  it("warns on lines that cover too much", () => {
    const r = release();
    const s = summary();
    for (let n = 0; n < MAX_COVERS_PER_LINE; n++) {
      const id = `2.0.14#3333333${n}`;
      r.items.push({ id, position: n + 2, rawText: `item ${n}` });
      s.classifications[id] = { kind: "fixed", featureIds: [] };
      s.lines[1]!.covers.push(id);
    }
    const issues = checkSummary(r, s);
    expect(issues).toEqual([{ level: "warning", message: expect.stringContaining("line 2") }]);
  });
});
