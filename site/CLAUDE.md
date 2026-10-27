# site/ (@cq/site)

Astro static site. `pnpm dev` / `pnpm build` from the root; output in `site/dist`.

- Content comes from `src/lib/content.ts`, which globs `content/` and re-validates every file
  with `@cq/schemas`. Do not redefine schemas or re-implement the coverage check or demo
  engine here.
- Display logic lives in pure, tested modules in `src/lib/` (`timeline.ts`: weekly grouping,
  summary visibility). Keep `.astro` files to markup; test new logic in `test/`.
- Only our own words appear (ADR 0008). A summary is shown only when approved and its
  `sourceHash` matches the release; otherwise the release shows "summary coming" with its
  change count. Every release links to its `sourceUrl`.
- Estimated dates (`dateSource: "estimated"`, ADR 0009) are shown as "by <date>".
- Render all content as text. Never use `set:html`, and ship no client JavaScript unless a
  feature needs it (demos, step 8).
- Styling is plain CSS in `src/styles/global.css` with light and dark palettes. The palette is
  deliberately not Anthropic's (see conception.md open decisions).
- `mockup/` shows the intended layout for later steps (feature pages, demos). Use it as a
  visual reference, not its code.
