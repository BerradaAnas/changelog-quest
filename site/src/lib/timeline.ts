import { type ChangeKind, compareVersions, type Release, type ReleaseSummary } from "@cq/schemas";

/**
 * Release timeline for display (conception.md 5.2, ADRs 0007-0009). Pure: takes validated
 * content, returns what the page renders. Only approved summaries are shown, and only when
 * they still match the release's source text.
 */

export interface SummaryView {
  title: string;
  headline: string;
  sections: { kind: ChangeKind; label: string; lines: string[] }[];
  featureIds: string[];
  /** Only ever true in local preview. */
  draft: boolean;
}

export interface VersionEntry {
  version: string;
  publishedAt: string;
  estimated: boolean;
  sourceUrl: string;
  itemCount: number;
  /** Absent until an approved summary exists: the page shows "summary coming". */
  summary?: SummaryView;
}

export interface WeekCard {
  /** Monday of the week, YYYY-MM-DD (UTC). */
  week: string;
  /** Newest first. One entry: a release card. Several: a "Week of" digest. */
  entries: VersionEntry[];
}

export interface MonthGroup {
  /** YYYY-MM of the newest release in each of its cards. */
  month: string;
  cards: WeekCard[];
}

const KINDS: { kind: ChangeKind; label: string }[] = [
  { kind: "added", label: "Added" },
  { kind: "changed", label: "Changed" },
  { kind: "fixed", label: "Fixed" },
  { kind: "removed", label: "Removed" },
  { kind: "other", label: "Other" },
];

/**
 * The summary a visitor may see: approved, and written against the release's current text.
 * `includeDrafts` is for local preview only (`pnpm dev:drafts`).
 */
export function visibleSummary(
  release: Release,
  summary: ReleaseSummary | undefined,
  includeDrafts = false,
): ReleaseSummary | undefined {
  if (!summary || summary.sourceHash !== release.sourceHash) return undefined;
  if (summary.status !== "approved" && !includeDrafts) return undefined;
  return summary;
}

export function summaryView(
  release: Release,
  summary: ReleaseSummary | undefined,
  includeDrafts = false,
): SummaryView | undefined {
  const visible = visibleSummary(release, summary, includeDrafts);
  if (!visible) return undefined;
  const sections = KINDS.map(({ kind, label }) => ({
    kind,
    label,
    lines: visible.lines.filter((l) => l.kind === kind).map((l) => l.text),
  })).filter((s) => s.lines.length > 0);
  const featureIds = [
    ...new Set(Object.values(visible.classifications).flatMap((c) => c.featureIds)),
  ];
  return {
    title: visible.title,
    headline: visible.headline,
    sections,
    featureIds,
    draft: visible.status !== "approved",
  };
}

/** Monday (UTC) of the calendar week containing the date, as YYYY-MM-DD. */
export function weekOf(iso: string): string {
  const d = new Date(iso);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export function versionEntry(
  release: Release,
  summary: ReleaseSummary | undefined,
  includeDrafts = false,
): VersionEntry {
  const view = summaryView(release, summary, includeDrafts);
  return {
    version: release.version,
    publishedAt: release.publishedAt,
    estimated: release.dateSource === "estimated",
    sourceUrl: release.sourceUrl,
    itemCount: release.items.length,
    ...(view ? { summary: view } : {}),
  };
}

/** Newest first: by date, then by version. */
export const newestFirst = (
  a: { publishedAt: string; version: string },
  b: { publishedAt: string; version: string },
) => b.publishedAt.localeCompare(a.publishedAt) || compareVersions(b.version, a.version);

export function buildTimeline(
  releases: readonly Release[],
  summaries: ReadonlyMap<string, ReleaseSummary>,
  includeDrafts = false,
): MonthGroup[] {
  const entries = releases
    .map((r) => versionEntry(r, summaries.get(r.version), includeDrafts))
    .sort(newestFirst);

  const months: MonthGroup[] = [];
  for (const entry of entries) {
    const week = weekOf(entry.publishedAt);
    const month = months.at(-1);
    const card = month?.cards.at(-1);
    if (month && card?.week === week) {
      card.entries.push(entry);
      continue;
    }
    const label = entry.publishedAt.slice(0, 7);
    if (month?.month === label) month.cards.push({ week, entries: [entry] });
    else months.push({ month: label, cards: [{ week, entries: [entry] }] });
  }
  return months;
}

export interface TimelineStats {
  releases: number;
  summarized: number;
}

export const timelineStats = (months: readonly MonthGroup[]): TimelineStats => {
  const all = months.flatMap((m) => m.cards.flatMap((c) => c.entries));
  return { releases: all.length, summarized: all.filter((e) => e.summary).length };
};
