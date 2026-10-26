import { z } from "zod";

/** Claude Code release version, e.g. "2.0.14". Pre-release suffixes are allowed. */
export const Version = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, "not a semver version");

/** ISO 8601 timestamp with an explicit offset. */
export const DateTime = z.iso.datetime({ offset: true });

/** Lowercase hex SHA-256. */
export const Sha256 = z.string().regex(/^[0-9a-f]{64}$/, "not a sha256 hex digest");

/** Kebab-case slug used as a feature id. */
export const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "not a kebab-case slug");

/**
 * Stable change item id: "<version>#<first 8 hex of sha256(normalized text)>",
 * with "-2", "-3"... appended when a release repeats the same bullet.
 * See docs/decisions/0001-stable-change-item-ids.md.
 */
export const ChangeItemId = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?#[0-9a-f]{8}(?:-\d+)?$/, "not a change item id");

export const ChangeKind = z.enum(["added", "changed", "fixed", "removed", "other"]);
export type ChangeKind = z.infer<typeof ChangeKind>;

export const ReviewStatus = z.enum(["draft", "approved"]);
export type ReviewStatus = z.infer<typeof ReviewStatus>;
