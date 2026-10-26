---

name: add-feature
description: Add or update a feature page in content/features/. Use when asked to add, document, or update a Claude Code feature, or to record a feature event (introduced, updated, deprecated, removed).
---

# Add or update a feature

1. Read the official Claude Code docs for the feature (docs.claude.com). Every statement must
   be backed by a page you put in `docUrls`. Don't rely on memory: features change often.
2. Pick the id: a short kebab-case slug (`hooks`, `sub-agents`). The file is
   `content/features/<id>.json`; the schema is `Feature` in `schemas/src/feature.ts`.
3. Write in plain language for a newcomer:
   - `summary`: one sentence. `what`: a short paragraph.
   - `impact`: 2 to 4 concrete benefits. `howItWorks`: 3 to 6 short steps.
   - `area`: `core` (built in), `extend` (hooks, MCP, plugins, skills...), `anywhere`
     (IDE, web, CI and other surfaces).
4. Events: exactly one `introduced` event with the first version that shipped the feature. Find
   it in `content/releases/`. Add `updated`, `deprecated` or `removed` events for later
   milestones, each with a one-line `note`.
5. Link the matching changelog items: in each relevant `content/summaries/<version>.json`, add
   the feature id to the items' `classifications[...].featureIds`. This is the only place
   item-to-feature links live (ADR 0002).
6. If you added an `updated`, `deprecated` or `removed` event and the feature has a demo, set
   the demo's `status` to `draft` and say so (ADR 0007).
7. Run `pnpm validate`. Warnings about events with no linked items mean step 5 is incomplete.
