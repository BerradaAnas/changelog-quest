# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Changelog Quest turns the Claude Code changelog and docs into short release summaries, plain-language feature pages, and scripted JavaScript demos. "Git is the database": content is JSON under `content/`, and the site will be static (Astro).

Read before non-trivial work:

- `docs/conception.md`: product design, data model, rules, build plan (section 9 shows what's done and what's next).
- `docs/architecture.md`: packages, data flow, enforced invariants, trust boundaries.
- `docs/decisions/`: why the design changed from the first draft. Changes that affect the design need a new record (`record-decision` skill).

Each of `schemas/`, `pipeline/`, `content/` and `site/` has its own CLAUDE.md with local rules.

## Commands

Node 24 and pnpm through Corepack (`corepack enable` once).

```bash
pnpm install
pnpm check                                   # lint + typecheck + test + validate (what CI runs)
pnpm test                                    # all packages
pnpm --filter @cq/schemas test               # one package
pnpm --filter @cq/pipeline exec vitest run test/ids.test.ts -t "disambiguates"   # one test
pnpm validate                                # schemas, ids, cross-references, coverage on content/
pnpm format                                  # Biome autofix
npx serve mockup                             # view the design mock-up
```

## Architecture in brief

- `@cq/schemas` (Zod 4) is the single source of truth for every content shape, plus pure shared rules: the "nothing lost" coverage check and the demo engine. The pipeline and the future site import it; never redefine schemas elsewhere. It must stay free of Node APIs.
- `@cq/pipeline` holds Node scripts: the content validator, hash-based item ids, config (pinned model, cut-off, bot branch). Parser, npm dates and AI drafting come next.
- Packages export TypeScript source directly (no build step); imports use `.ts` extensions.
- Key data rules (ADRs 0001 to 0003):
  - Item ids are text hashes (`2.0.14#0a1b2c3d`), not positions.
  - Releases are ingest-only.
  - Classifications (`kind`, `featureIds`) live in the summary file and are the only item-to-feature link.
  - Unapproved releases are shown raw with "summary pending".
- `pnpm validate` is the CI gate for content. New content rules go there, with tests.

## Non-negotiables

- Changelog text, AI output and visitor input are untrusted: render as text, never as HTML, never execute. The AI drafting step gets no tools. AI output that fails the schema is rejected, not patched.
- Feature and demo content must match the official docs it links to.
- `mockup/` is a prototype (custom mini-runtime in `support.js`, see its header). Don't build on its code or copy its Anthropic-like branding into the real site.

## Project skills (`.claude/skills/`)

`review-summary`, `add-feature`, `write-demo`, `record-decision`.
