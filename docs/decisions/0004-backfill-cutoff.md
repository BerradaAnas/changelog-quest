# 0004. Backfill with a summary cut-off date

Status: Superseded by 0008
Date: 2026-10-26

## Context

Claude Code has hundreds of past versions. Drafting and reviewing a summary for each would mean
hundreds of reviews before launch.

## Decision

All past releases are ingested (Release + items). Only releases published on or after
`config.summaryCutoff` (`pipeline/src/config.ts`) get AI summaries. Older releases are shown raw
(see 0003). Backfill PRs are batched, not one per version.

## Consequences

The cut-off can be moved earlier later; moving it creates draft summaries for review. The
current value (2026-01-01) is a starting point to confirm before the backfill runs.
