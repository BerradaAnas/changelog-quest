# 0007. Weekly digests, review aids and staleness checks

Status: Accepted
Date: 2026-10-26

## Decision

- **Digest cards** are built from data, never generated: title "Week of <Monday date>", and
  the member releases' summary titles (or "summary pending") listed in version order.
- **Vague lines.** A summary line covering more than `MAX_COVERS_PER_LINE` (5) items is a
  validation warning. Coverage cannot prove a line is faithful; reviewers compare each line with
  the items it covers (side-by-side view in review PRs).
- **Stale features.** When a FeatureEvent of type `updated`, `deprecated` or `removed` is added,
  the feature's demo goes back to `draft`. A scheduled link check of `docUrls` is planned.
- **Visitor progress** carries a schema version (`LocalProgress.v`) for later migrations.
