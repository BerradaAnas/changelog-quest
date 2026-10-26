# site/

Not created yet. It will be an Astro static site (conception.md build plan steps 4 and 8).

When building it:

- Read content through `@cq/schemas`; do not redefine schemas or re-implement the coverage
  check or the demo engine.
- Render changelog text, summaries and visitor input as text, never with `set:html`.
- Releases without an approved summary show their raw items with "summary pending" (ADR 0003).
  Weekly grouping and digest titles follow conception.md 5.2 and ADR 0007.
- Use `mockup/` only as a visual reference, not its code or its Anthropic-like branding.
