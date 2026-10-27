# site/

Not created yet. It will be an Astro static site (conception.md build plan steps 4 and 8).

When building it:

- Read content through `@cq/schemas`; do not redefine schemas or re-implement the coverage
  check or the demo engine.
- Render changelog text, summaries and visitor input as text, never with `set:html`.
- Only our own words appear (ADR 0008). Releases without an approved summary show version,
  date, change count, "summary coming" and the GitHub link. Every release links to its
  `sourceUrl`.
  Weekly grouping and digest titles follow conception.md 5.2 and ADR 0007.
- Show estimated dates (`dateSource: "estimated"`, ADR 0009) as "by <date>".
- `mockup/` shows the intended layout (release cards, weekly digests, pending cards, demos).
  Use it as a visual reference, not its code or its Anthropic-like palette.
