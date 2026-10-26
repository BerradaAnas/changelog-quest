/** Pipeline settings. Changing any of these is a reviewed change, like content. */
export const config = {
  changelogRepo: "anthropics/claude-code",
  changelogPath: "CHANGELOG.md",
  npmPackage: "@anthropic-ai/claude-code",
  /** Pinned model for summary drafts; recorded in every ReleaseSummary. */
  summaryModel: "claude-haiku-5-5",
  summaryMaxTokens: 2000,
  /**
   * Releases published before this date are shown raw and never sent to the API.
   * See docs/decisions/0004-backfill-cutoff.md.
   */
  summaryCutoff: "2026-01-01T00:00:00Z",
  /** The single branch the daily run updates; see docs/decisions/0006-pipeline-pull-requests.md. */
  ingestBranch: "bot/ingest",
} as const;
