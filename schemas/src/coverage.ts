import type { Release } from "./release.ts";
import type { ReleaseSummary } from "./summary.ts";

/** Lines covering more items than this get a warning: likely too vague. */
export const MAX_COVERS_PER_LINE = 5;

export interface Issue {
  level: "error" | "warning";
  message: string;
}

/**
 * The "nothing lost" rules (conception.md 5.1) for one release and its summary.
 * Errors block approval; warnings are for the reviewer.
 */
export function checkSummary(release: Release, summary: ReleaseSummary): Issue[] {
  const issues: Issue[] = [];
  const error = (message: string) => issues.push({ level: "error", message });
  const itemIds = new Set(release.items.map((i) => i.id));

  if (summary.version !== release.version) {
    error(`summary is for ${summary.version}, release is ${release.version}`);
  }
  if (summary.status === "approved" && summary.sourceHash !== release.sourceHash) {
    error("release source changed since approval; set status back to draft and re-review");
  }

  const covered = new Set<string>();
  summary.lines.forEach((line, n) => {
    for (const id of line.covers) {
      if (!itemIds.has(id)) error(`line ${n + 1} covers unknown item ${id}`);
      covered.add(id);
    }
    if (line.covers.length > MAX_COVERS_PER_LINE) {
      issues.push({
        level: "warning",
        message: `line ${n + 1} covers ${line.covers.length} items; consider splitting it`,
      });
    }
  });
  for (const id of itemIds) {
    if (!covered.has(id)) error(`item ${id} is not covered by any line`);
    if (!(id in summary.classifications)) error(`item ${id} has no classification`);
  }
  for (const id of Object.keys(summary.classifications)) {
    if (!itemIds.has(id)) error(`classification for unknown item ${id}`);
  }
  return issues;
}
