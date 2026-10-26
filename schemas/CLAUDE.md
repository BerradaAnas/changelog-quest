# schemas/ (@cq/schemas)

Zod schemas for every content file, plus pure rules shared by the pipeline and the site.

- This package is the source of truth for the data model. When a schema changes, update
  `docs/conception.md` section 4 in the same change, and add a decision record in
  `docs/decisions/` if it changes meaning (not just a typo or a message).
- No Node APIs (`node:*`) here: the site imports this package in the browser. Hashing and file
  access belong in `pipeline/`.
- Objects use `z.strictObject` so unknown keys fail validation (AI output included).
- Import siblings with the `.ts` extension; `src/index.ts` re-exports everything.
- Tests: `pnpm --filter @cq/schemas test`; fixtures in `test/fixtures.ts` are the canonical
  valid examples, so update them first when a schema changes.
