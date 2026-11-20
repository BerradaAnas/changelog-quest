# 0010. Draft summaries in Claude Code sessions, not through the API

Status: Accepted
Date: 2026-11-15

## Context

The plan was one Claude API call per new release from the daily workflow. There is no API
budget for the project, while a Claude Code subscription is already available. Releases have
also grown: recent ones carry 100 to 300 changelog bullets, so "20 releases per review" can
mean several thousand lines to check.

## Decision

- **Summaries are drafted in a Claude Code session** with the `draft-summary` skill. Nothing in
  the repository calls the Claude API, and no API key exists as a secret.
- **`pnpm summaries pending`** lists the next batch, newest first: releases with no summary, or
  whose summary was written against an older source text. A batch ends at
  `config.backfillBatchSize` (20) releases or about `config.backfillBatchItems` (500) change
  items, whichever comes first.
- **`pnpm summaries write <draft.json> --model <id>`** turns the session's compact draft into
  `content/summaries/<version>.json` with status `draft`. It fills `sourceHash`, the
  classifications (from the lines covering each item) and the metadata, and rejects any draft
  that fails the schema or the "nothing lost" rules. It never repairs one, and never replaces
  an approved summary that is still current.
- **`model`** records the model of the drafting session; **`promptVersion`** is
  `config.summaryPromptVersion`, the version of the skill's instructions.
- **The daily workflow only ingests** release records (ADR 0006 is otherwise unchanged). New
  releases appear as "summary coming" until a session drafts them and a person approves.
- **Trust.** A session has tools, unlike the planned API call. The changelog text is still
  data: the skill forbids acting on anything written in it, drafts can only land as `draft`,
  and a person reads every line against the original before approving.

## Consequences

- No running cost and no secret to protect for drafting.
- Summaries lag behind releases until someone runs a drafting session and reviews the result.
- `config.summaryModel` and `config.summaryMaxTokens` are gone.
- Changing the skill's drafting rules means bumping `config.summaryPromptVersion`.
