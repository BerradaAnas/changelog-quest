# Remaining work for phase 1

Status on 2026-11-20. Code for build plan steps 0–9 is written (see `conception.md` section 9);
what is left is accounts, reviews, content and the launch. How-tos are in `operations.md`.

**Scope for launch:** feature pages and demos are the core of the site. Release summaries
cover only the last month; older releases keep the "summary coming" card linking to GitHub.
Launch early, then decide on more work based on whether people use it (ADR 0013).

## 1. Land the current branch

- [x] Open the pull request for `finish-phase-1` (commit `3134e0b`, pushed, not merged):
      https://github.com/BerradaAnas/changelog-quest/compare/main...finish-phase-1?expand=1
- [x] Let CI (`pnpm check`) pass, review, merge into `main`.

## 2. Account setup (owner only)

- [x] Create the ingest GitHub App (Contents and Pull requests: read and write, no webhook),
      install it on this repository only.
- [x] Add the Actions variable `INGEST_APP_CLIENT_ID` and the secret `INGEST_APP_PRIVATE_KEY`.
- [x] Protect `main`: require a pull request and the `check` job.
- [x] Create the Cloudflare Pages project named `changelog-quest` (build `pnpm build`, output
      `site/dist`) and check that `SITE_URL` matches its address.

## 3. Feature catalog and demos (the core)

- [x] Reach 15–25 features: 16 so far (`add-feature` skill). Add more where newcomers need them.
- [ ] Review and approve the 3 draft demos: `hooks`, `skills`, `checkpointing`.
- [ ] Write demos for the new features (`write-demo` skill).

## 4. Release summaries (last month only)

The last month (since 2026-10-20) is 17 releases and about 1,360 items. The 2 already drafted
are not approved, so the public build shows no summaries yet.

- [ ] Review and approve `2.1.325` and `2.1.322` (`review-summary` skill).
- [ ] Draft and approve the other 15 releases of the last month (`draft-summary` skill),
      starting with `2.1.323` (294 items) and `2.1.321` (118 items).
- [ ] After launch: keep up with new releases as the daily ingest brings them in.
- [ ] Dropped: no backfill of the ~420 older releases. Revisit only if people ask for it.

## 5. Decision to make: summaries for very large releases

Under the "nothing lost" rule (`conception.md` 5.1), every item needs a summary line, so a
release of 100–300 items takes hours to draft and review.

- [ ] Track review time on the last-month batch.
- [ ] If it is the bottleneck, record an ADR (`record-decision` skill): still classify every
      item, but write lines only for changes a user would notice, with small fixes counted
      (for example "plus 120 small fixes").

## 6. Open decisions (`conception.md` section 10)

- [x] Sign off on a palette and font of our own (ADR 0014).
- [ ] Choose a custom domain (optional; `changelog-quest.pages.dev` works until then).
- [ ] Optional: tell Anthropic about the project.

## 7. Launch (build plan step 10)

- [ ] Run `pnpm check` and `pnpm source verify`.
- [ ] Deploy to Cloudflare Pages and check the security headers on the live site.
- [ ] Mark phase 1 as launched in `conception.md` section 9.
- [ ] Share it, then watch whether people use it before planning more work.
