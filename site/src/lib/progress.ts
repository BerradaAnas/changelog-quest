import type { LocalProgress } from "@cq/schemas";

/**
 * Visitor progress in localStorage (conception.md 4.5). Hand-validated here so the browser
 * bundle does not carry Zod; a test keeps this in step with the `LocalProgress` schema.
 */

export const PROGRESS_KEY = "changelog-quest:progress";
export const THEMES = ["system", "light", "dark"] as const;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const emptyProgress = (): LocalProgress => ({ v: 1, tried: [], quiz: {}, theme: "system" });

/** Parses stored text. Anything unreadable or of another shape starts fresh. */
export function parseProgress(text: string | null): LocalProgress {
  if (!text) return emptyProgress();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return emptyProgress();
  }
  if (typeof data !== "object" || data === null) return emptyProgress();
  const d = data as Record<string, unknown>;
  if (d.v !== 1 || !Array.isArray(d.tried) || typeof d.quiz !== "object" || d.quiz === null) {
    return emptyProgress();
  }
  const tried = d.tried.filter((t): t is string => typeof t === "string" && SLUG.test(t));
  const quiz: Record<string, boolean> = {};
  for (const [id, passed] of Object.entries(d.quiz)) {
    if (SLUG.test(id) && typeof passed === "boolean") quiz[id] = passed;
  }
  const theme = THEMES.find((t) => t === d.theme) ?? "system";
  return { v: 1, tried: [...new Set(tried)], quiz, theme };
}

export const markTried = (p: LocalProgress, featureId: string): LocalProgress =>
  p.tried.includes(featureId) ? p : { ...p, tried: [...p.tried, featureId] };

export const nextTheme = (theme: LocalProgress["theme"]): LocalProgress["theme"] =>
  THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] ?? "system";
