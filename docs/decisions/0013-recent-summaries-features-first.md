# 0013. Summaries only for recent releases; features come first

Status: Accepted
Date: 2026-11-21

## Context

ADR 0008 dropped the summary cut-off of ADR 0004 and planned a summary for every past release,
newest first. By November 2026 that meant 439 releases, and recent ones are large: 2.1.323
alone has 294 change items. Every item needs a line and a human review (rule 5.1), so the
backfill would take months of reviewing, while the feature pages and demos, which give
newcomers the most value, were still at 5 features and 3 draft demos.

## Decision

- Only releases published on or after `config.summaryCutoff` (`pipeline/src/config.ts`, set to
  2026-10-20) get summaries. `pnpm summaries pending` lists nothing older, except a summary
  that already exists and went stale (ADR 0012).
- Older releases keep the "summary coming" card linking to GitHub (ADR 0008); nothing else
  changes on the site.
- Before launch, the feature catalog (15 to 25 features) and its demos take priority over
  summaries.
- The "nothing lost" rule is unchanged. Whether very large releases may list only notable
  changes is left open until review time on the recent batch has been measured.

## Consequences

- The summary backlog drops from 439 releases to 15, and new releases arrive above the cut-off.
- Older releases may never get summaries; moving the cut-off earlier brings them back into
  `pnpm summaries pending`, newest first.
