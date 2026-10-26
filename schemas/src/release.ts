import { z } from "zod";
import { ChangeItemId, DateTime, Sha256, Version } from "./common.ts";

/** One bullet of a release, word for word. Classification lives in the summary file. */
export const ChangeItem = z.strictObject({
  id: ChangeItemId,
  position: z.int().nonnegative(),
  rawText: z.string().min(1),
});
export type ChangeItem = z.infer<typeof ChangeItem>;

/** content/releases/<version>.json — ingested, never edited by hand. */
export const Release = z.strictObject({
  version: Version,
  publishedAt: DateTime,
  sourceUrl: z.url(),
  /** Commit of anthropics/claude-code that CHANGELOG.md was read from. */
  sourceCommit: z.string().regex(/^[0-9a-f]{40}$/),
  /** sha256 of rawMarkdown; a change on a past release sends its summary back to draft. */
  sourceHash: Sha256,
  rawMarkdown: z.string().min(1),
  fetchedAt: DateTime,
  items: z.array(ChangeItem),
});
export type Release = z.infer<typeof Release>;
