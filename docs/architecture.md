# Architecture

How the parts fit together today. `conception.md` holds the product design and build plan;
`decisions/` records why things changed. Update this file when a package, data flow, or
invariant changes.

## Packages

| Path        | Package        | Role                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemas/`  | `@cq/schemas`  | Zod schemas for every content file, plus pure rules shared by pipeline and site: coverage check (`coverage.ts`), demo engine (`demo-engine.ts`). No Node APIs, so the site can import it in the browser.                                                                                                                                                                                 |
| `pipeline/` | `@cq/pipeline` | Node scripts: changelog parser (`parse-changelog.ts`), upstream reader and verifier (`source.ts`), ingest with npm dates (`ingest.ts`, `npm.ts`), summary batches and draft builder (`summaries.ts`), content validator (`validate.ts`), id hashing (`ids.ts`), config.                                                                                                                  |
| `site/`     | `@cq/site`     | Astro static site. `src/lib/content.ts` loads and re-validates `content/` at build time; pure, tested modules build the timeline (`timeline.ts`), feature pages (`features.ts`), the RSS feed (`rss.ts`) and visitor progress (`progress.ts`). Small client scripts in `src/scripts/` run demos, search (Pagefind) and the theme switch. `scripts/check-dist.ts` checks the built pages. |
| `content/`  | data           | The database. JSON only, validated in CI.                                                                                                                                                                                                                                                                                                                                                |
| `mockup/`   | prototype      | Design reference only; not shared with the real site.                                                                                                                                                                                                                                                                                                                                    |

Packages export TypeScript source directly (no build). Import with `.ts` extensions.

## Data flow

```
anthropics/claude-code CHANGELOG.md ─┐
npm registry publish dates ──────────┼─▶ pipeline: parse ─▶ content/releases/<v>.json   (ingested)
                                     │
Claude Code session (draft-summary) ─┼─▶ pnpm summaries write ─▶ content/summaries/<v>.json (draft)
                                     │
human (PR review) ───────────────────┴─▶ summaries approved, content/features, content/demos
                                                     │
                              pnpm validate (CI gate) ▼
                                         site build ─▶ static hosting
```

## Content files

| File                               | Schema           | Written by                 | Notes                                                   |
| ---------------------------------- | ---------------- | -------------------------- | ------------------------------------------------------- |
| `content/releases/<version>.json`  | `Release`        | pipeline only              | Includes its `items`. Never hand-edited.                |
| `content/summaries/<version>.json` | `ReleaseSummary` | session draft, human edits | Holds `classifications`: the only item -> feature link. |
| `content/features/<id>.json`       | `Feature`        | human                      | Includes `events`.                                      |
| `content/demos/<featureId>.json`   | `Demo`           | human                      | At most one per feature.                                |
| `content/runs/<date>.json`         | `IngestRun`      | pipeline                   | Only when something changed or failed.                  |

File names must equal the entity key; the validator enforces it.

## Invariants (enforced by `pnpm validate`)

- Item ids belong to their release, are unique, and positions are 0..n-1.
- Every item is classified and covered by a summary line, unless marked minor (never added or
  removed, never also covered; ADR 0016); every `covers` id exists (5.1).
- An added item links a feature or is marked `noFeature` (only on added items without
  features), otherwise a "possible new feature" warning (ADR 0017).
- A summary whose `sourceHash` differs from its release's is stale: a warning here, hidden on
  the site, and not checked for coverage (5.1.4, ADR 0012).
- Feature, release and input references resolve; demo regexes compile.

Enforced on the built site by `pnpm check:dist`: axe-core accessibility rules, and no inline
script, style or event handler (the Content Security Policy in `site/public/_headers` allows
none). The palette's contrast is tested in `site/test/contrast.test.ts`.

## Trust boundaries

- Changelog text, AI output and visitor input are untrusted data: rendered as text, never as
  HTML, never executed. A drafting session treats the changelog as data and can only produce
  drafts; `pnpm summaries write` rejects anything that fails the schema or coverage (ADR 0010).
- The ingest GitHub App key exists only as an Actions secret. Nothing calls the Claude API.
- Visitors never write anything; progress stays in `localStorage` and is re-validated when read.
- Demo input is matched against rules and shown with `textContent`; search excerpts are parsed
  in an inert document and only `<mark>` is kept.
