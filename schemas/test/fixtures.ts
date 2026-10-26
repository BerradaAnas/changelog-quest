import type { Demo, Feature, Release, ReleaseSummary } from "../src/index.ts";

const HASH = "a".repeat(64);

export const release = (): Release => ({
  version: "2.0.14",
  publishedAt: "2026-10-01T12:00:00Z",
  sourceUrl: "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md#2014",
  sourceCommit: "b".repeat(40),
  sourceHash: HASH,
  rawMarkdown: "## 2.0.14\n\n- Added hooks\n- Fixed a crash\n",
  fetchedAt: "2026-10-02T06:00:00Z",
  items: [
    { id: "2.0.14#11111111", position: 0, rawText: "Added hooks" },
    { id: "2.0.14#22222222", position: 1, rawText: "Fixed a crash" },
  ],
});

export const summary = (): ReleaseSummary => ({
  version: "2.0.14",
  sourceHash: HASH,
  title: "Hooks",
  headline: "Hooks arrive, and a crash is fixed.",
  lines: [
    { kind: "added", text: "Hooks run your scripts on events.", covers: ["2.0.14#11111111"] },
    { kind: "fixed", text: "Fixed a crash.", covers: ["2.0.14#22222222"] },
  ],
  classifications: {
    "2.0.14#11111111": { kind: "added", featureIds: ["hooks"] },
    "2.0.14#22222222": { kind: "fixed", featureIds: [] },
  },
  status: "approved",
  model: "claude-haiku-5-5",
  promptVersion: "summary-v1",
  generatedAt: "2026-10-02T06:01:00Z",
  approvedAt: "2026-10-02T09:00:00Z",
});

export const feature = (): Feature => ({
  id: "hooks",
  name: "Hooks",
  area: "extend",
  summary: "Run your own scripts when Claude Code does something.",
  what: "Shell commands triggered by events.",
  impact: [{ title: "Guardrails", detail: "Block risky commands." }],
  howItWorks: ["Configure a hook in settings.", "Claude Code runs it on the event."],
  docUrls: ["https://docs.claude.com/en/docs/claude-code/hooks"],
  status: "active",
  events: [{ version: "2.0.14", type: "introduced", note: "Hooks released." }],
});

export const demo = (): Demo => ({
  featureId: "hooks",
  title: "Block a command",
  intro: "Type a command and see whether the hook blocks it.",
  kind: "type",
  inputs: [{ id: "command", label: "Command", placeholder: "rm -rf /" }],
  rules: [
    {
      when: [{ input: "command", matches: "^rm\\s+-rf" }],
      show: {
        title: "Blocked",
        detail: "The hook exited with code 2.",
        outcome: "blocked",
        trace: [],
      },
    },
    {
      when: [{ input: "command", equals: "ls" }],
      show: { title: "Allowed", detail: "Nothing to block.", outcome: "success", trace: [] },
    },
  ],
  fallback: { title: "No rule", detail: "This demo only scripts a few commands." },
  configPreview: '{ "command": "{{command}}" }',
  quiz: {
    question: "Which exit code blocks?",
    options: ["0", "2"],
    answerIndex: 1,
    explanation: "Exit code 2 blocks the tool call.",
  },
  status: "approved",
});
