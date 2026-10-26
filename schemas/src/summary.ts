import { z } from "zod";
import {
  ChangeItemId,
  ChangeKind,
  DateTime,
  ReviewStatus,
  Sha256,
  Slug,
  Version,
} from "./common.ts";

/** AI-suggested, reviewer-approved classification of one ChangeItem. */
export const Classification = z.strictObject({
  kind: ChangeKind,
  /** The single source of truth for item -> feature links. */
  featureIds: z.array(Slug),
});
export type Classification = z.infer<typeof Classification>;

export const SummaryLine = z.strictObject({
  kind: ChangeKind,
  text: z.string().min(1),
  covers: z.array(ChangeItemId).min(1),
});
export type SummaryLine = z.infer<typeof SummaryLine>;

/** content/summaries/<version>.json — AI draft, a human approves by merging. */
export const ReleaseSummary = z
  .strictObject({
    version: Version,
    /** Release.sourceHash this summary was written against. */
    sourceHash: Sha256,
    title: z.string().min(1).max(80),
    headline: z.string().min(1).max(200),
    lines: z.array(SummaryLine).min(1),
    classifications: z.record(ChangeItemId, Classification),
    status: ReviewStatus,
    model: z.string().min(1),
    promptVersion: z.string().min(1),
    generatedAt: DateTime,
    approvedAt: DateTime.optional(),
  })
  .refine((s) => s.status !== "approved" || s.approvedAt !== undefined, {
    message: "approved summaries need approvedAt",
    path: ["approvedAt"],
  });
export type ReleaseSummary = z.infer<typeof ReleaseSummary>;
