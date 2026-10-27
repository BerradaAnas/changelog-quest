import { z } from "zod";
import { ChangeItemId, DateTime, Sha256, Version } from "./common.ts";

/**
 * One bullet of a release. Its wording is never stored (ADR 0008): the id is a hash of the
 * upstream text, which `pnpm source` fetches when someone needs to read it.
 * Classification lives in the summary file.
 */
export const ChangeItem = z.strictObject({
  id: ChangeItemId,
  position: z.int().nonnegative(),
});
export type ChangeItem = z.infer<typeof ChangeItem>;

/** content/releases/<version>.json — ingested, never edited by hand. Holds no upstream text. */
export const Release = z.strictObject({
  version: Version,
  publishedAt: DateTime,
  /**
   * "npm": the npm publish time. "estimated": the version was never published to npm, so
   * publishedAt is the publish time of the next newer version, an upper bound (ADR 0009).
   */
  dateSource: z.enum(["npm", "estimated"]),
  sourceUrl: z.url(),
  /** Commit of anthropics/claude-code that CHANGELOG.md was read from. */
  sourceCommit: z.string().regex(/^[0-9a-f]{40}$/),
  /** sha256 of the upstream section; a change on a past release sends its summary back to draft. */
  sourceHash: Sha256,
  fetchedAt: DateTime,
  items: z.array(ChangeItem),
});
export type Release = z.infer<typeof Release>;
