/** Pipeline settings. Changing any of these is a reviewed change, like content. */
export const config = {
  changelogRepo: "anthropics/claude-code",
  changelogPath: "CHANGELOG.md",
  npmPackage: "@anthropic-ai/claude-code",
  /** Pinned model for summary drafts; recorded in every ReleaseSummary. */
  summaryModel: "claude-haiku-5-5",
  summaryMaxTokens: 2000,
  /** Past releases get summaries newest first, this many per review PR (ADR 0008). */
  backfillBatchSize: 20,
  /** The single branch the daily run updates; see docs/decisions/0006-pipeline-pull-requests.md. */
  ingestBranch: "bot/ingest",
} as const;
