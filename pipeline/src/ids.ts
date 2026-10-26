import { createHash } from "node:crypto";

export const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

/** Whitespace-insensitive form of a bullet, so reflowed text keeps its id. */
export const normalizeBullet = (text: string): string => text.trim().replace(/\s+/g, " ");

/**
 * Ids for the bullets of one release, in order. Ids depend on the text, not the position,
 * so inserting or reordering bullets upstream does not break summary coverage or feature links.
 */
export function changeItemIds(version: string, bullets: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return bullets.map((bullet) => {
    const base = `${version}#${sha256(normalizeBullet(bullet)).slice(0, 8)}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  });
}
