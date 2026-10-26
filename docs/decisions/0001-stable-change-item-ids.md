# 0001. Stable change item ids

Status: Accepted
Date: 2026-10-26

## Context

The conception used `<version>#<position>` ids. Inserting or reordering one bullet in a past
release upstream would shift every later id, so summary `covers` and feature links would point
at the wrong items without any error.

## Decision

`ChangeItem.id` is `<version>#<first 8 hex chars of sha256(normalized bullet)>`. Normalization
trims and collapses whitespace. A repeated identical bullet in the same release gets `-2`,
`-3`, ... in order. `position` stays as a separate field for display order.

Implemented in `pipeline/src/ids.ts`; `pnpm validate` recomputes every id.

## Consequences

- Reordering or inserting bullets keeps existing ids.
- Editing a bullet's wording creates a new id. The coverage check then fails on the old id,
  which is the intended signal: the summary must be re-reviewed.
