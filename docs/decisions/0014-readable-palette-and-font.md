# 0014. Readable palette and font of our own

Status: Accepted
Date: 2026-11-22

## Context

Early feedback: the site was hard to read in both themes. Body text was small (13 to 16 px),
headings mixed a serif with the system sans, and greys were low in contrast. The palette was
also still close to the mock-up's, which section 10 of `conception.md` left open.

## Decision

- Body text in Atkinson Hyperlegible Next (designed for legibility); headings in Source Serif 4
  (600). Both self-hosted through Fontsource, so the Content Security Policy stays
  `font-src 'self'`.
- Body text at 17 px with a 1.65 line height; small text no smaller than 14 px.
- A warm, Claude-inspired palette of our own: cream and warm charcoal backgrounds with a copper
  accent (`#a84f1f` light, `#e8956a` dark). It evokes Claude without using Anthropic's brand
  colours, typefaces or marks, so the site still reads as independent ("not affiliated").
  Every text pair stays at WCAG AA or better (`site/test/contrast.test.ts`).
- Demos on feature pages are collapsed by default. Once opened, the setup and the result sit
  side by side; the result appears only after a run, coloured by its outcome, with its trace
  shown as a dark session log.
- Each feature area has its own colour (core copper, extend violet, anywhere teal), used on
  cards, area titles and feature pages.

## Consequences

- The "visual identity" open decision is closed.
- One more runtime dependency for the site (font files, no JavaScript).
