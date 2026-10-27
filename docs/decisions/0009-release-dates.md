# 0009. Release dates from npm, estimated when a version was never published

Status: Accepted
Date: 2026-10-27

## Context

The changelog has no dates. The npm registry has a publish time for nearly every version, but
8 of the 431 versions in the changelog (as of upstream `08c6a4f`) were never published to npm.
The commit that added a version's heading is not a reliable date either: several entries were
written after the next version had already shipped.

## Decision

- `publishedAt` is the npm publish time (`dateSource: "npm"`).
- A version missing from npm takes the publish time of the nearest newer version that is on
  npm (`dateSource: "estimated"`). It is an upper bound: the version came out no later than
  that, and the timeline order stays correct.
- A new version with no newer published version yet is not ingested; the next run picks it up
  once npm has it.
- A past release whose text changes keeps its original date.

## Consequences

The site should mark estimated dates (for example "by Sep 4, 2025"). Weekly grouping may place
an estimated version a few days late, never out of order.
