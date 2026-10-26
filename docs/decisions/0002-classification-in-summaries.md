# 0002. Classifications live in summaries; one source for feature links

Status: Accepted
Date: 2026-10-26

## Context

The conception stored `kind` and `featureIds` on `ChangeItem`, which is ingested data that is
"never edited by hand", yet reviewers must be able to override them. Feature links were also
stored twice (`ChangeItem.featureIds` and `FeatureEvent.changeItemIds`), plus
`Feature.introducedIn` repeated the "introduced" event. `ChangeItem.kind` allowed `"other"` but
`SummaryLine.kind` did not.

## Decision

- `content/releases/*.json` holds only ingested data: id, position, rawText.
- `ReleaseSummary.classifications` maps every item id to `{ kind, featureIds }`. The AI
  suggests it, the reviewer edits it, and it is the **only** item -> feature link.
- `FeatureEvent` keeps `version`, `type`, `note`. Related items are derived from
  classifications. `Feature.introducedIn` is removed; use `introducedIn(feature)`.
- One `ChangeKind` enum (`added | changed | fixed | removed | other`) for items and lines.
- `ReleaseSummary.status` is `draft | approved`. Merged + approved = published; the
  `published` status is dropped.
- `ReleaseSummary.sourceHash` records which source text was reviewed, so rule 5.1.4 is checked
  statically: an approved summary whose hash differs from the release fails validation.

## Consequences

Re-ingesting a release never overwrites editorial work. A feature event without any linked
item in its release is a validation warning.
