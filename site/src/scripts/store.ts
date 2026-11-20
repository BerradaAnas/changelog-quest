import type { LocalProgress } from "@cq/schemas";
import { emptyProgress, PROGRESS_KEY, parseProgress } from "../lib/progress.ts";

/** localStorage access. Storage can be blocked; the site then works without saved progress. */
export function loadProgress(): LocalProgress {
  try {
    return parseProgress(localStorage.getItem(PROGRESS_KEY));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: LocalProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Nothing to do: progress simply isn't kept.
  }
}
