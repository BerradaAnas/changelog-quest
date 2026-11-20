# 0012. A summary of a changed release is hidden, not a validation error

Status: Accepted
Date: 2026-11-15

## Context

Upstream sometimes edits a past release. Ingest then rewrites the release record with a new
`sourceHash` and new item ids. The validator treated an approved summary carrying the old hash
as an error (rule 5.1.4), along with every coverage error the changed ids caused. The daily
workflow validates before it pushes, so one upstream edit to a summarized release would have
stopped the ingest pull request, and new releases with it, until someone fixed it by hand.

## Decision

- A summary whose `sourceHash` differs from its release's is **stale**. `checkSummary` reports
  it once as a warning and skips the coverage rules for it.
- Nothing stale is published: the site already shows a summary only when it is approved and
  its hash matches, and falls back to "summary coming".
- `pnpm summaries pending` lists stale summaries first in line with new releases, so the next
  drafting session rewrites them.
- Ingest still never edits a summary file (ADR 0002).

## Consequences

- The daily ingest keeps working when upstream edits history.
- A summarized release can go back to "summary coming" without a person deciding it; the
  validation warning and the pending list are how it gets noticed.
