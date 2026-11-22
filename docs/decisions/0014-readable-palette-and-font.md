# 0014. Readable palette and font of our own

Status: Accepted
Date: 2026-11-22

## Context

Early feedback: the site was hard to read in both themes. Body text was small (13 to 16 px),
headings mixed a serif with the system sans, and greys were low in contrast. The palette was
also still close to the mock-up's, which section 10 of `conception.md` left open.

## Decision

- One typeface, Atkinson Hyperlegible Next (designed for legibility), self-hosted through
  `@fontsource/atkinson-hyperlegible-next` so the Content Security Policy stays `font-src 'self'`.
  Weights 400 and 700 only.
- Body text at 17 px with a 1.65 line height; small text no smaller than 14 px.
- A cool neutral palette with a cobalt accent, in light and dark, distinct from Anthropic's.
  Every text pair stays at WCAG AA or better (`site/test/contrast.test.ts`).
- Demos on feature pages are collapsed by default and open on request.

## Consequences

- The "visual identity" open decision is closed.
- One more runtime dependency for the site (font files, no JavaScript).
