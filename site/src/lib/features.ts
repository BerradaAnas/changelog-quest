import type { ChangeKind, Demo, Feature, FeatureEvent, Release, ReleaseSummary } from "@cq/schemas";
import { introducedIn } from "@cq/schemas";
import { newestFirst, visibleSummary } from "./timeline.ts";

/**
 * Feature pages (conception.md 4.3). Pure: a feature's update history is derived from its
 * events plus the summary lines whose items are classified with the feature (ADR 0002).
 */

export const AREAS: { area: Feature["area"]; label: string; blurb: string }[] = [
  { area: "core", label: "Built in", blurb: "Part of Claude Code from the first prompt." },
  { area: "extend", label: "Extend it", blurb: "Ways to add your own rules, tools and helpers." },
  { area: "anywhere", label: "Use it anywhere", blurb: "Editors, the web, CI and other surfaces." },
];

export const EVENT_LABELS: Record<FeatureEvent["type"], string> = {
  introduced: "Introduced",
  updated: "Updated",
  deprecated: "Deprecated",
  removed: "Removed",
};

export interface HistoryEntry {
  version: string;
  publishedAt: string;
  estimated: boolean;
  events: { type: FeatureEvent["type"]; note: string }[];
  /** Summary lines of that release about this feature. */
  lines: { kind: ChangeKind; text: string }[];
}

export interface FeatureView {
  feature: Feature;
  introducedIn: string;
  /** Newest first. */
  history: HistoryEntry[];
  /** Absent until the demo is approved. */
  demo?: Demo;
}

export interface FeatureContext {
  releases: ReadonlyMap<string, Release>;
  summaries: ReadonlyMap<string, ReleaseSummary>;
  demos: ReadonlyMap<string, Demo>;
  includeDrafts?: boolean;
}

/** Lines of a summary that cover at least one item classified with the feature. */
export function linesAbout(summary: ReleaseSummary, featureId: string) {
  const linked = (id: string) => summary.classifications[id]?.featureIds.includes(featureId);
  return summary.lines
    .filter((l) => l.covers.some(linked))
    .map((l) => ({ kind: l.kind, text: l.text }));
}

export function featureView(feature: Feature, ctx: FeatureContext): FeatureView {
  const entries = new Map<string, HistoryEntry>();
  const entry = (version: string) => {
    const release = ctx.releases.get(version);
    if (!release) return undefined;
    let e = entries.get(version);
    if (!e) {
      e = {
        version,
        publishedAt: release.publishedAt,
        estimated: release.dateSource === "estimated",
        events: [],
        lines: [],
      };
      entries.set(version, e);
    }
    return e;
  };
  for (const event of feature.events) {
    entry(event.version)?.events.push({ type: event.type, note: event.note });
  }
  for (const release of ctx.releases.values()) {
    const summary = visibleSummary(release, ctx.summaries.get(release.version), ctx.includeDrafts);
    if (!summary) continue;
    const lines = linesAbout(summary, feature.id);
    if (lines.length > 0) entry(release.version)?.lines.push(...lines);
  }
  const demo = ctx.demos.get(feature.id);
  const showDemo = demo && (demo.status === "approved" || ctx.includeDrafts);
  return {
    feature,
    introducedIn: introducedIn(feature),
    history: [...entries.values()].sort(newestFirst),
    ...(showDemo ? { demo } : {}),
  };
}

/** Features grouped by area in display order, each group sorted by name; empty areas dropped. */
export function featuresByArea<T extends { feature: Feature }>(views: readonly T[]) {
  return AREAS.map((a) => ({
    ...a,
    features: views
      .filter((v) => v.feature.area === a.area)
      .sort((x, y) => x.feature.name.localeCompare(y.feature.name)),
  })).filter((g) => g.features.length > 0);
}
