# Architecture

How the parts fit together today. `conception.md` holds the product design and build plan;
`decisions/` records why things changed. Update this file when a package, data flow, or
invariant changes.

## Packages

| Path        | Package         | Role                                                                                                                                                                                                                                                                   |
| ----------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemas/`  | `@cq/schemas`   | Zod schemas for every content file, plus pure rules shared by pipeline and site: coverage check (`coverage.ts`), demo engine (`demo-engine.ts`). No Node APIs, so the site can import it in the browser.                                                               |
| `pipeline/` | `@cq/pipeline`  | Node scripts: changelog parser (`parse-changelog.ts`), upstream reader and verifier (`source.ts`), ingest with npm dates (`ingest.ts`, `npm.ts`), content validator (`validate.ts`), id hashing (`ids.ts`), config. Summary drafting and the daily workflow come next. |
| `site/`     | not created yet | Astro static site (build plan step 7).                                                                                                                                                                                                                                 |
| `content/`  | data            | The database. JSON only, validated in CI.                                                                                                                                                                                                                              |
| `mockup/`   | prototype       | Design reference only; not shared with the real site.                                                                                                                                                                                                                  |

Packages export TypeScript source directly (no build). Import with `.ts` extensions.

## Data flow

```
anthropics/claude-code CHANGELOG.md ─┐
npm registry publish dates ──────────┼─▶ pipeline: parse ─▶ content/releases/<v>.json   (ingested)
                                     │                 └─▶ Claude API ─▶ content/summaries/<v>.json (draft)
                                     │
human (PR review) ───────────────────┴─▶ summaries approved, content/features, content/demos
                                                     │
                              pnpm validate (CI gate) ▼
                                         site build ─▶ static hosting
```

## Content files

| File                               | Schema           | Written by            | Notes                                                   |
| ---------------------------------- | ---------------- | --------------------- | ------------------------------------------------------- |
| `content/releases/<version>.json`  | `Release`        | pipeline only         | Includes its `items`. Never hand-edited.                |
| `content/summaries/<version>.json` | `ReleaseSummary` | AI draft, human edits | Holds `classifications`: the only item -> feature link. |
| `content/features/<id>.json`       | `Feature`        | human                 | Includes `events`.                                      |
| `content/demos/<featureId>.json`   | `Demo`           | human                 | At most one per feature.                                |
| `content/runs/<date>.json`         | `IngestRun`      | pipeline              | Only when something changed or failed.                  |

File names must equal the entity key; the validator enforces it.

## Invariants (enforced by `pnpm validate`)

- Item ids belong to their release, are unique, and positions are 0..n-1.
- Every item is covered by a summary line and classified; every `covers` id exists (5.1).
- An `approved` summary's `sourceHash` equals its release's (5.1.4).
- Feature, release and input references resolve; demo regexes compile.

## Trust boundaries

- Changelog text, AI output and visitor input are untrusted data: rendered as text, never as
  HTML, never executed. The AI drafting step has no tools.
- The Claude API key and the GitHub App key exist only as Actions secrets.
- Visitors never write anything; progress stays in `localStorage`.
