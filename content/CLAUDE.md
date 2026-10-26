# content/

The database. JSON files only; `pnpm validate` must pass after any change.

- `releases/` is written by the pipeline. Do not hand-edit it; fix the parser instead.
- `summaries/`: edit `title`, `headline`, `lines` and `classifications` freely while
  `status` is `draft`. Approving means setting `status: "approved"` and `approvedAt`. Use the
  `review-summary` skill.
- `features/` and `demos/` are editorial. Use the `add-feature` and `write-demo` skills.
- Every factual claim in a feature or demo must match the official docs linked in `docUrls`.
- File name = entity key (`<version>.json`, `<feature id>.json`).
