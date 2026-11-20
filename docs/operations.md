# Operations

How to run the parts that need an account or a person. Design and rules are in
`conception.md`; this file is the checklist.

## Draft and approve summaries (ADR 0010)

1. In a Claude Code session, ask for the next batch ("draft the next summaries"). The
   `draft-summary` skill runs `pnpm summaries pending`, reads each release with
   `pnpm source show`, and writes drafts with `pnpm summaries write`.
2. Review with the `review-summary` skill, or by hand: compare every line with
   `pnpm source show <version>`, then set `status` to `approved` and add `approvedAt`.
3. `pnpm dev:drafts` shows drafts (summaries and demos) in the local site, labelled as drafts.
   A normal build never shows them.
4. Open a pull request. CI runs `pnpm check`.

## Daily ingest (`.github/workflows/ingest.yml`, ADR 0006)

The workflow needs a GitHub App so that its pull request triggers CI:

1. Create a GitHub App (Settings > Developer settings > GitHub Apps) with repository
   permissions **Contents: read and write** and **Pull requests: read and write**. No webhook.
2. Install it on this repository only.
3. In the repository's Actions settings, add the variable `INGEST_APP_CLIENT_ID` (the app's
   client ID) and the secret `INGEST_APP_PRIVATE_KEY` (a generated private key).
4. Protect `main`: require a pull request and the `check` job.

Each run updates the single `bot/ingest` branch and opens its pull request if none is open.
Until the app exists the scheduled run fails at its first step and changes nothing; run
`pnpm ingest` locally instead.

## Hosting (Cloudflare Pages, ADR 0011)

- Build command `pnpm build`, output directory `site/dist`, Node version from `.nvmrc`.
- `SITE_URL` is the public address, used for canonical links and the RSS feed. It defaults to
  `https://changelog-quest.pages.dev`: name the Cloudflare project `changelog-quest` so that
  address is ours, or set `SITE_URL` to the address Cloudflare assigns.
- `site/public/_headers` carries the security headers. `pnpm check:dist` fails if a page
  contains anything inline that the Content Security Policy would block.

## Before the public launch

- Approve at least the newest batch of summaries, and the three demos in `content/demos/`.
- Create the Cloudflare Pages project and check that `SITE_URL` matches its address.
- Confirm the palette (conception.md section 10).
- Run `pnpm check` and `pnpm source verify`.
