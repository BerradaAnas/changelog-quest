import type { ReleaseSummary } from "@cq/schemas";

/**
 * Detects summary lines whose wording stays too close to the upstream bullets they cover
 * (ADR 0008: own words only). Pure; the upstream text is passed in at run time.
 */

/** Lowercase, drop Markdown code marks and the leading verb upstream bullets start with. */
export function normalize(text: string): string {
  return text
    .replace(/[`*]/g, "")
    .replace(
      /^(\[[^\]]+\]\s*)?([\w -]+:\s*)?(fixed|added|changed|improved|removed|updated|reverted)\s+/i,
      "",
    )
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** 1 minus the Levenshtein distance over the longer length: 1 means identical text. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
    }
    prev = cur;
  }
  return 1 - (prev[b.length] ?? 0) / Math.max(a.length, b.length);
}

export interface CloseLine {
  index: number;
  score: number;
  text: string;
}

/** Lines scoring at or above the threshold against any covered bullet, or all of them joined. */
export function closeLines(
  summary: ReleaseSummary,
  bullets: ReadonlyMap<string, string>,
  threshold: number,
): CloseLine[] {
  return summary.lines.flatMap((line, index) => {
    const parts = line.covers.map((id) => normalize(bullets.get(id) ?? ""));
    const text = normalize(line.text);
    const score = Math.max(
      ...parts.map((p) => similarity(text, p)),
      similarity(text, parts.join(" ")),
    );
    return score >= threshold ? [{ index, score, text: line.text }] : [];
  });
}
