import type { ChangeKind, Release, ReleaseSummary } from "@cq/schemas";

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

export function summaryView(release: Release, summary: ReleaseSummary | undefined) {
  if (summary?.status !== "approved" || summary.sourceHash !== release.sourceHash) {
    return undefined;
  }
  const sections = KINDS.map(({ kind, label }) => ({
    kind,
    label,
    lines: summary.lines.filter((l) => l.kind === kind).map((l) => l.text),
  })).filter((s) => s.lines.length > 0);
  const featureIds = [
    ...new Set(Object.values(summary.classifications).flatMap((c) => c.featureIds)),
  ];
  return { title: summary.title, headline: summary.headline, sections, featureIds };
}

/** Monday (UTC) of the calendar week containing the date, as YYYY-MM-DD. */
export function weekOf(iso: string): string {
  const d = new Date(iso);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

/** Compares "1.2.3" style versions numerically; pre-releases sort before their release. */
export function compareVersions(a: string, b: string): number {
  const [coreA = "", preA] = a.split("-", 2);
  const [coreB = "", preB] = b.split("-", 2);
  const pa = coreA.split(".").map(Number);
  const pb = coreB.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (preA === preB) return 0;
  if (preA === undefined) return 1;
  if (preB === undefined) return -1;
  return preA < preB ? -1 : 1;
}

export function buildTimeline(
  releases: readonly Release[],
  summaries: ReadonlyMap<string, ReleaseSummary>,
): MonthGroup[] {
  const entries: VersionEntry[] = releases
    .map((r) => {
      const summary = summaryView(r, summaries.get(r.version));
      return {
        version: r.version,
        publishedAt: r.publishedAt,
        estimated: r.dateSource === "estimated",
        sourceUrl: r.sourceUrl,
        itemCount: r.items.length,
        ...(summary ? { summary } : {}),
      };
    })
    .sort(
      (a, b) => b.publishedAt.localeCompare(a.publishedAt) || compareVersions(b.version, a.version),
    );

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
