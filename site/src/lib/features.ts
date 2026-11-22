import type { ChangeKind, Demo, Feature, FeatureEvent, Release, ReleaseSummary } from "@cq/schemas";
import { introducedIn } from "@cq/schemas";
import { newestFirst, visibleSummary } from "./timeline.ts";

/**
 * Feature pages (conception.md 4.3). Pure: a feature's update history is derived from its
 * events plus the summary lines whose items are classified with the feature (ADR 0002).
 */

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
  /** Publish date of the introducing release, when that release is known. */
  introducedAt?: string;
  introducedEstimated: boolean;
  /** Publish date of the newest release with an `updated` event, if any. */
  updatedAt?: string;
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
  const first = ctx.releases.get(introducedIn(feature));
  const updates = feature.events
    .filter((e) => e.type === "updated")
    .map((e) => ctx.releases.get(e.version)?.publishedAt)
    .filter((d): d is string => d !== undefined)
    .sort();
  return {
    feature,
    introducedIn: introducedIn(feature),
    ...(first ? { introducedAt: first.publishedAt } : {}),
    introducedEstimated: first?.dateSource === "estimated",
    ...(updates.length > 0 ? { updatedAt: updates[updates.length - 1] } : {}),
    history: [...entries.values()].sort(newestFirst),
    ...(showDemo ? { demo } : {}),
  };
}

/** Features count as new or recently updated for this many days. */
export const FRESH_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The date "recent" is measured from: the newest release, not the build time, so the same
 * content always builds the same site.
 */
export function freshnessReference(releases: Iterable<Release>): string | undefined {
  let newest: string | undefined;
  for (const r of releases) if (!newest || r.publishedAt > newest) newest = r.publishedAt;
  return newest;
}

const within = (date: string | undefined, reference: string) =>
  date !== undefined && Date.parse(reference) - Date.parse(date) <= FRESH_DAYS * DAY_MS;

/** "new" if introduced in the window, "updated" if an older feature was updated in it. */
export function freshness(view: FeatureView, reference: string | undefined) {
  if (!reference) return undefined;
  if (within(view.introducedAt, reference)) return "new" as const;
  if (within(view.updatedAt, reference)) return "updated" as const;
  return undefined;
}

/** Features introduced in the window, newest first. */
export function newFeatures(views: readonly FeatureView[], reference: string | undefined) {
  return views
    .filter((v) => freshness(v, reference) === "new")
    .sort((a, b) => (b.introducedAt ?? "").localeCompare(a.introducedAt ?? ""));
}
