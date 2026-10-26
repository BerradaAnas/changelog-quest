# 0006. How the daily pipeline opens pull requests

Status: Accepted
Date: 2026-10-26

## Context

Pull requests opened with the default `GITHUB_TOKEN` do not trigger other workflows, so CI would
never run on the bot's PRs. Daily runs would also open a new PR while yesterday's is unmerged.

## Decision

- The ingest workflow authenticates as a GitHub App with only `contents: write` and
  `pull-requests: write` on this repository. Its key is an Actions secret.
- Each run force-updates a single branch (`config.ingestBranch`) from `main` and opens the PR
  only if none is open, so there is at most one pending ingest PR.
- The ingest workflow also runs `pnpm validate` before pushing.
- `IngestRun` files are written only for runs that changed something or failed.
- Each run records the `anthropics/claude-code` commit SHA it read.
