# 0017. Flag additions that link no feature

Status: Accepted
Date: 2026-11-22

## Context

The feature catalog is written by hand. New releases arrive daily, and when one adds a
feature that has no page yet, its items simply get no `featureIds`. Nothing reported it, so a
new feature could be summarized and never get a page.

## Decision

- Every `added` item either links at least one feature or is marked `noFeature: true` in its
  classification: reviewed, and not a feature of its own (a new environment variable, a hint,
  a metric).
- An `added` item with neither is a validator warning ("possible new feature"). The reviewer
  links it, adds the feature page (`add-feature` skill), or marks it `noFeature`.
- `noFeature` is only valid on `added` items with no `featureIds`; anything else is an error.
- Drafts mark it per line (`"noFeature": true`). `pnpm summaries write` lists the additions
  still unlinked. The drafting prompt version becomes `draft-summary-v3`.
- The 19 unlinked additions in existing summaries were reviewed: 9 now link a feature, 10
  are marked `noFeature`.

## Consequences

- A new feature can't pass review unnoticed when it appears in the changelog.
- Features documented without ever appearing in the changelog are still not detected; a
  periodic check of the docs index covers those.
