# 0016. Count small changes instead of summarizing each one

Status: Accepted
Date: 2026-11-22

## Context

Rule 5.1.1 required a summary line for every change item. Recent releases are very large:
2.1.326 had 367 items and the five releases of 2026-11-17 to 2026-11-20 about 880. Writing
and reviewing a line for each takes hours, and to fit the 5-items-per-line limit, unrelated
small fixes were grouped into lines that mix kinds. The open question in ADR 0013 (whether
large releases may list only notable changes) is now answered.

## Decision

- Every item is still classified (`kind`, `featureIds`).
- An item may be marked `minor: true` in its classification. A minor item needs no summary
  line; the site counts minor items by kind ("Plus 120 small fixes, 14 small changes,
  listed in the original changelog").
- Only `fixed`, `changed` and `other` items can be minor. Added and removed items always get
  a line. A minor item can't also be covered by a line.
- Lines are written for changes a user would notice: new or removed commands, settings,
  flags and variables; behavior and default changes; permission, sandbox and security
  changes; fixes for data loss, crashes, hangs or wrong results. Cosmetic, layout, wording,
  and narrow platform or terminal fixes may be minor.
- Session drafts list minor ids by kind in a `minor` field; `pnpm summaries write` turns them
  into classifications. The drafting prompt version becomes `draft-summary-v2`.

## Consequences

- Big releases get shorter summaries that are faster to review, with no item lost: each one
  is classified and counted, and the release still links to the original.
- Minor items carry no feature links, so they don't appear in feature histories.
- Existing summaries stay valid: they mark nothing minor.
