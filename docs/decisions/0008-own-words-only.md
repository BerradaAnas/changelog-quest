# 0008. Publish only our own words; never store the upstream text

Status: Accepted
Date: 2026-10-26

## Context

`anthropics/claude-code` is "© Anthropic PBC. All rights reserved." The first design stored
every changelog section and bullet verbatim (`rawMarkdown`, `rawText`), showed them for
unreviewed releases (ADR 0003) and in a "compare with the original" view. That is a full copy
of the changelog in a public repository and site. Facts (what changed, in which version) are
free to state; the wording is not ours to republish.

Rewriting each of the 8,284 bullets one by one was rejected: no one can review that many
lines, so they would be published unreviewed, and short technical bullets barely change when
reworded.

## Decision

- **Nothing verbatim is committed or published.** Release files keep only version, date,
  source commit, `sourceHash`, and item ids and positions. Ids are still hashes of the upstream
  text (ADR 0001), so change detection works without storing it.
- **The upstream text is read at run time only:** by the pipeline (parsing, drafting
  summaries) and by people reviewing (`pnpm source show <version>`). `pnpm source verify`
  re-fetches each recorded commit and checks hashes and ids; it runs in CI.
- **Approved summaries are the only release text on the site.** Every release card links to
  its section of the original changelog on GitHub. The "compare" view becomes a coverage note
  ("all N changes covered") plus that link.
- **Releases without an approved summary** show version, date, change count, "summary coming",
  and the GitHub link. Supersedes ADR 0003.
- **No fixed cut-off.** Past releases get summaries newest first, `config.backfillBatchSize`
  (20) per review PR. Supersedes ADR 0004.
- Test fixtures use invented changelog text only.

## Consequences

- No permission from Anthropic is needed; asking remains a courtesy.
- `pnpm validate` stays offline and checks structure; upstream consistency needs network
  (`pnpm source verify`).
- Reviewers read the original through `pnpm source show` or the GitHub link, never from the repo.
- If upstream removes or rewrites a section, its stored ids and hash still identify what was
  reviewed, and verify reports the difference.
