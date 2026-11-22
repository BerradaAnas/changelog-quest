# site/ (@cq/site)

Astro static site. `pnpm dev` / `pnpm build` from the root; output in `site/dist`. `pnpm build`
also builds the Pagefind search index; `pnpm check:dist` then checks the built pages.

- Content comes from `src/lib/content.ts`, which globs `content/` and re-validates every file
  with `@cq/schemas`. Do not redefine schemas or re-implement the coverage check or demo
  engine here.
- Display logic lives in pure, tested modules in `src/lib/` (`timeline.ts`: weekly grouping,
  summary visibility; `features.ts`: feature history; `rss.ts`; `progress.ts`). Keep `.astro`
  files to markup; test new logic in `test/`.
- Features are grouped like the official docs' sections (`src/lib/sections.ts`, tested so every
  feature sits in exactly one section); feature pages show that sidebar, an "On this page" list
  and previous/next links.
- Features introduced in the last 30 days (`FRESH_DAYS` in `features.ts`) get a "New" badge and
  a "New features" section; older ones updated in that window get "Updated". The window is
  measured from the newest release, not the build time, so builds stay reproducible.
- Pages: `/` (features and timeline), `/features/`, `/features/<id>/`, `/releases/<version>/`,
  `/search/`, `/rss.xml`. Only feature pages and summarized release pages carry
  `data-pagefind-body`, so only they are searchable.
- `pnpm dev:drafts` (`CQ_DRAFTS=1`) previews draft summaries and demos, labelled as drafts.
  Never set it for a real build.
- Only our own words appear (ADR 0008). A summary is shown only when approved and its
  `sourceHash` matches the release; otherwise the release shows "summary coming" with its
  change count. Every release links to its `sourceUrl`.
- Estimated dates (`dateSource: "estimated"`, ADR 0009) are shown as "by <date>".
- Render all content as text. Never use `set:html`. Client scripts live in `src/scripts/` and
  build DOM with `textContent` only; keep them small and free of Zod (`@cq/schemas/demo-engine`
  is the only schemas import that reaches the browser).
- No inline scripts, styles, `style` attributes or event handlers: the Content Security Policy
  in `public/_headers` blocks them and `pnpm check:dist` fails the build.
- New colours go in both palettes in `global.css` and in `test/contrast.test.ts` (WCAG AA).
- Styling is plain CSS in `src/styles/global.css` with light and dark palettes. The look is
  Claude-inspired but our own (ADR 0014): never Anthropic's exact brand colours, typefaces,
  logo or marks.
- `mockup/` shows the intended layout for later steps (feature pages, demos). Use it as a
  visual reference, not its code.
