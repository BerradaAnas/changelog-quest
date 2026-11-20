import { readFileSync } from "node:fs";
import { LOCAL_PROGRESS_KEY, LocalProgress, emptyProgress as schemaEmpty } from "@cq/schemas";
import { describe, expect, it } from "vitest";
import {
  emptyProgress,
  markQuiz,
  markTried,
  nextTheme,
  PROGRESS_KEY,
  parseProgress,
} from "../src/lib/progress.ts";

describe("progress", () => {
  it("stays in step with the LocalProgress schema", () => {
    expect(PROGRESS_KEY).toBe(LOCAL_PROGRESS_KEY);
    expect(emptyProgress()).toEqual(schemaEmpty());
    const stored = JSON.stringify({ v: 1, tried: ["hooks"], quiz: { hooks: true }, theme: "dark" });
    expect(LocalProgress.parse(parseProgress(stored))).toEqual(JSON.parse(stored));
  });

  it("is the key and version the early theme script reads", () => {
    const script = readFileSync(new URL("../public/theme.js", import.meta.url), "utf8");
    expect(script).toContain(`"${LOCAL_PROGRESS_KEY}"`);
    expect(script).toContain(`saved.v === ${emptyProgress().v}`);
  });

  it("starts fresh on unreadable data or another version", () => {
    for (const text of [
      null,
      "",
      "{",
      "[]",
      '"x"',
      JSON.stringify({ v: 2, tried: [], quiz: {} }),
    ]) {
      expect(parseProgress(text)).toEqual(emptyProgress());
    }
  });

  it("drops entries that are not valid", () => {
    const text = JSON.stringify({
      v: 1,
      tried: ["hooks", "hooks", "<script>", 3],
      quiz: { hooks: "yes", skills: false, "Bad Id": true },
      theme: "pink",
    });
    const parsed = parseProgress(text);
    expect(parsed).toEqual({ v: 1, tried: ["hooks"], quiz: { skills: false }, theme: "system" });
    expect(LocalProgress.safeParse(parsed).success).toBe(true);
  });

  it("records tries and quiz results without losing a pass", () => {
    let p = markTried(markTried(emptyProgress(), "hooks"), "hooks");
    expect(p.tried).toEqual(["hooks"]);
    p = markQuiz(markQuiz(p, "hooks", true), "hooks", false);
    expect(p.quiz).toEqual({ hooks: true });
    expect(markQuiz(p, "skills", false).quiz.skills).toBe(false);
  });

  it("cycles themes", () => {
    expect(["system", "light", "dark"].map((t) => nextTheme(t as "system"))).toEqual([
      "light",
      "dark",
      "system",
    ]);
  });
});
