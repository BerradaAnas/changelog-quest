/** Pipeline settings. Changing any of these is a reviewed change, like content. */
export const config = {
  changelogRepo: "anthropics/claude-code",
  changelogPath: "CHANGELOG.md",
  npmPackage: "@anthropic-ai/claude-code",
  /** Version of the drafting instructions (`draft-summary` skill); recorded in every summary. */
  summaryPromptVersion: "draft-summary-v1",
  /**
   * Releases get summaries newest first. One review PR holds at most this many releases and
   * about this many change items, whichever comes first (ADRs 0008, 0010).
   */
  backfillBatchSize: 20,
  backfillBatchItems: 500,
  /** The single branch the daily run updates; see docs/decisions/0006-pipeline-pull-requests.md. */
  ingestBranch: "bot/ingest",
} as const;
