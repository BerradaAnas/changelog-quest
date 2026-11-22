# 0015. The timeline shows only releases since the summary cut-off

Status: Accepted
Date: 2026-11-22

## Context

ADR 0013 limited summaries to releases since the cut-off but kept every older release on the
home timeline as a "summary coming" card. That is over 400 cards that will never get a
summary, pushing the useful part of the site out of view.

## Decision

- The cut-off moves to `SUMMARY_CUTOFF` in `@cq/schemas`, so the pipeline and the site share it.
  `config.summaryCutoff` points to it.
- The home timeline lists only releases published on or after the cut-off, and ends with a
  link to the official changelog for older ones.
- Release records for older versions stay in `content/releases/` (ingest-only, ADR 0003), and
  their release pages are still built, so feature histories that link to them keep working.

## Consequences

- New releases from the daily ingest appear on the timeline as before.
- Moving the cut-off earlier brings older releases back onto the timeline and into
  `pnpm summaries pending`.
