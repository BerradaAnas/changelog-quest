import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { changeItemIds, sha256 } from "../src/ids.ts";
import { validateContent } from "../src/validate.ts";

const raw = "## 2.0.14\n\n- Added hooks\n- Fixed a crash\n";
const bullets = ["Added hooks", "Fixed a crash"];
const [hookId, crashId] = changeItemIds("2.0.14", bullets) as [string, string];

function content() {
  return {
    "releases/2.0.14.json": {
      version: "2.0.14",
      publishedAt: "2026-10-01T12:00:00Z",
      sourceUrl: "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#2014",
      sourceCommit: "b".repeat(40),
      sourceHash: sha256(raw),
      fetchedAt: "2026-10-02T06:00:00Z",
      items: [hookId, crashId].map((id, position) => ({ id, position })),
    },
    "summaries/2.0.14.json": {
      version: "2.0.14",
      sourceHash: sha256(raw),
      title: "Hooks",
      headline: "Hooks arrive.",
      lines: [
        { kind: "added", text: "Hooks.", covers: [hookId] },
        { kind: "fixed", text: "A crash.", covers: [crashId] },
      ],
      classifications: {
        [hookId]: { kind: "added", featureIds: ["hooks"] },
        [crashId]: { kind: "fixed", featureIds: [] },
      },
      status: "draft",
      model: "claude-haiku-5-5",
      promptVersion: "summary-v1",
      generatedAt: "2026-10-02T06:01:00Z",
    },
    "features/hooks.json": {
      id: "hooks",
      name: "Hooks",
      area: "extend",
      summary: "s",
      what: "w",
      impact: [],
      howItWorks: [],
      docUrls: ["https://docs.claude.com/en/docs/claude-code/hooks"],
      status: "active",
      events: [{ version: "2.0.14", type: "introduced", note: "n" }],
    },
  } as Record<string, unknown>;
}

async function run(files: Record<string, unknown>) {
  const root = await mkdtemp(join(tmpdir(), "cq-content-"));
  for (const [path, data] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true });
    await writeFile(join(root, path), typeof data === "string" ? data : JSON.stringify(data));
  }
  return validateContent(root);
}

describe("validateContent", () => {
  it("accepts consistent content", async () => {
    expect(await run(content())).toEqual([]);
  });

  it("reports invalid JSON and schema errors with the file", async () => {
    const issues = await run({ "releases/1.0.0.json": "{", "features/x.json": { id: "x" } });
    expect(issues.map((i) => i.file)).toContain("releases/1.0.0.json");
    expect(issues.some((i) => i.file === "features/x.json")).toBe(true);
  });

  it("checks item ids and positions", async () => {
    const files = content();
    const r = files["releases/2.0.14.json"] as { items: { id: string; position: number }[] };
    r.items[1] = { id: hookId, position: 3 };
    r.items.push({ id: "2.0.15#00000000", position: 2 });
    const messages = (await run(files)).map((i) => i.message);
    expect(messages).toContain(`item ${hookId} has position 3, expected 1`);
    expect(messages).toContain(`item ${hookId} appears twice`);
    expect(messages).toContain("item 2.0.15#00000000 is not from 2.0.14");
  });

  it("checks cross references", async () => {
    const files = content();
    (
      files["summaries/2.0.14.json"] as {
        classifications: Record<string, { featureIds: string[] }>;
      }
    ).classifications[crashId]!.featureIds.push("nope");
    files["summaries/9.9.9.json"] = {
      ...(files["summaries/2.0.14.json"] as object),
      version: "9.9.9",
    };
    const messages = (await run(files)).map((i) => i.message);
    expect(messages).toContain(`${crashId} links unknown feature nope`);
    expect(messages).toContain("no release 9.9.9");
  });

  it("validates demo rules against inputs", async () => {
    const files = content();
    files["demos/hooks.json"] = {
      featureId: "hooks",
      title: "t",
      intro: "i",
      kind: "type",
      inputs: [{ id: "command", label: "Command" }],
      rules: [
        {
          when: [
            { input: "other", equals: "x" },
            { input: "command", matches: "(" },
          ],
          show: { title: "{{nope}}", detail: "d", outcome: "info", trace: [] },
        },
      ],
      fallback: { title: "f", detail: "d" },
      configPreview: "{{missing}}",
      quiz: { question: "q", options: ["a", "b"], answerIndex: 0, explanation: "e" },
      status: "draft",
    };
    const messages = (await run(files)).map((i) => i.message);
    expect(messages).toEqual([
      "rule 1 uses unknown input other",
      "rule 1 has an invalid regular expression",
      "rule 1 outcome uses unknown input nope",
      "configPreview uses unknown input missing",
    ]);
  });
});
