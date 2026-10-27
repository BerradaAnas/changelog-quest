# 0003. Show releases without an approved summary as raw entries

Status: Superseded by 0008
Date: 2026-10-26

## Context

"Nothing published unless approved" would hide a new release until someone reviews it, so the
site would lag behind the real changelog.

## Decision

A release with no summary, or only a draft, is shown with its original bullets and a
"summary pending" label. Draft summary text is never shown. The "nothing lost" guarantee is
kept: raw entries are the original text.

## Consequences

The site is always current. The site must render raw changelog text as plain text (no raw
HTML), the same as any untrusted input.
