# pipeline/ (@cq/pipeline)

Node scripts that write and check `content/`. Run with `tsx`, no build.

- `pnpm validate` (from the root) runs `src/validate.ts` on `content/`. Every new content rule
  goes there with a test in `test/validate.test.ts`; pure per-entity rules go in `@cq/schemas`.
- `src/config.ts` holds the model id, token cap, backfill batch size and bot branch. Changing it is
  a reviewed change.
- Item ids come only from `changeItemIds()` in `src/ids.ts` (ADR 0001). Never derive ids
  elsewhere.
- Releases are written by the pipeline only. Re-ingesting must never touch summaries,
  features or demos (ADR 0002).
- Changelog text and model output are untrusted: parse them as data, validate with the schema,
  and reject (never patch) output that fails. The summary call gets no tools.
- Upstream wording is read at run time (`src/source.ts`) and must never be written to
  `content/`, logs committed to the repo, or fixtures (ADR 0008). `toRelease()` keeps only the
  hash and item ids.
- `src/parse-changelog.ts` is strict: any unrecognised line fails the whole parse. Upstream
  is flat `## X.Y.Z` sections of `- ` bullets. If it changes format, extend the parser with a
  test; never skip lines. `test/fixtures/` holds invented text in the upstream format.
- Next steps (conception.md section 9): npm date lookup, backfill of release records.
