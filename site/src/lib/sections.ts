import type { Feature } from "@cq/schemas";

/**
 * Feature navigation, grouped like the sections of the official Claude Code docs
 * (code.claude.com/docs). Every feature appears in exactly one section; the order here is the
 * sidebar order and the previous/next order on feature pages.
 */
export const SECTIONS: { id: string; label: string; blurb: string; featureIds: string[] }[] = [
  {
    id: "getting-started",
    label: "Getting started",
    blurb: "How a session works day to day: memory, history, context and review.",
    featureIds: ["memory", "sessions", "context", "checkpointing", "plan-mode", "code-review"],
  },
  {
    id: "platforms",
    label: "Platforms and integrations",
    blurb: "Where you can use Claude Code besides the terminal.",
    featureIds: [
      "ide",
      "desktop",
      "web",
      "remote-control",
      "chrome",
      "computer-use",
      "slack",
      "github-actions",
    ],
  },
  {
    id: "build",
    label: "Build with Claude Code",
    blurb: "Agents, tools, automation and ways to run work in parallel.",
    featureIds: [
      "sub-agents",
      "agent-view",
      "agent-teams",
      "cross-session-messaging",
      "workflows",
      "worktrees",
      "mcp",
      "skills",
      "artifacts",
      "hooks",
      "channels",
      "loop",
      "cloud-scheduled-tasks",
      "goal",
      "headless",
      "deep-links",
    ],
  },
  {
    id: "plugins",
    label: "Plugins",
    blurb: "Package and share extensions, or change Claude Code itself.",
    featureIds: ["plugins", "mods"],
  },
  {
    id: "configuration",
    label: "Configuration",
    blurb: "Settings, permissions, models and the terminal interface.",
    featureIds: [
      "settings",
      "permissions",
      "auto-mode",
      "sandboxing",
      "models",
      "fast-mode",
      "advisor",
      "code-mode",
      "output-styles",
      "fullscreen",
      "accessibility",
      "voice",
      "status-line",
      "keybindings",
    ],
  },
  {
    id: "administration",
    label: "Administration",
    blurb: "Providers, infrastructure and monitoring for organizations.",
    featureIds: ["cloud-providers", "self-hosted-environments", "monitoring"],
  },
  {
    id: "agent-sdk",
    label: "Agent SDK",
    blurb: "Build your own agents on the Claude Code engine.",
    featureIds: ["agent-sdk"],
  },
];

/** Sections with their features in sidebar order; unknown ids and empty sections dropped. */
export function featuresBySection<T extends { feature: Feature }>(views: readonly T[]) {
  const byId = new Map(views.map((v) => [v.feature.id, v]));
  return SECTIONS.map((s) => ({
    ...s,
    features: s.featureIds.flatMap((id) => {
      const v = byId.get(id);
      return v ? [v] : [];
    }),
  })).filter((s) => s.features.length > 0);
}

/** The section a feature sits in, and its neighbours in sidebar order. */
export function placeOf(id: string, known: ReadonlySet<string>) {
  const order = SECTIONS.flatMap((s) => s.featureIds).filter((f) => known.has(f));
  const i = order.indexOf(id);
  return {
    section: SECTIONS.find((s) => s.featureIds.includes(id)),
    prev: i > 0 ? order[i - 1] : undefined,
    next: i >= 0 && i < order.length - 1 ? order[i + 1] : undefined,
  };
}
