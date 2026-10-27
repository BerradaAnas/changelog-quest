---

name: write-demo
description: Write or update a scripted demo in content/demos/ for a feature. Use when asked to create, edit, or fix a hands-on example, simulation, or quiz for a feature.
---

# Write a feature demo

A demo is a small scripted simulation: the visitor picks or types something, and fixed rules
decide what Claude Code would do. No AI runs. Schema: `Demo` in `schemas/src/demo.ts`; engine:
`runDemo` in `schemas/src/demo-engine.ts`.

1. The feature must exist in `content/features/`. Base every outcome on its `docUrls`; quote the
   real behaviour (exit codes, setting names, messages), not a guess.
2. Pick `kind`: `choose` (options on every input), `type` (free text), `toggle` (on/off
   options). Free-text inputs can offer one-tap `suggestions`.
3. Write `rules` in priority order; the first rule whose conditions all hold wins.
   - `equals` compares trimmed text, ignoring case. For `choose`, it must be one of the options.
   - `matches` is a regular expression with the `i` flag. Keep it simple and anchored.
   - Exactly one of `equals` / `matches` per condition.
4. Each outcome: a short `title`, a `detail` that explains why, and a `trace` of steps (`who`
   is "You", "Claude Code", "Hook"... and `code: true` for commands or JSON). Any of these
   texts may echo the visitor's input with `{{inputId}}`.
5. `fallback` explains that the demo only scripts some inputs. Never pretend to evaluate
   arbitrary input.
6. Optional `configPreview`: the settings snippet, with `{{inputId}}` placeholders.
7. `quiz`: one question that checks the key idea. `answerIndex` is zero-based.
8. Write everything in your own words; never paste documentation sentences.
9. Leave `status: "draft"` unless the user asks you to approve it.
10. Run `pnpm validate`. To check behaviour, write a quick Vitest case with `runDemo` for each
    rule and for the fallback.
