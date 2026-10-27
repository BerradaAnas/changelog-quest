# Changelog Quest

**Every Claude Code update, summarized and playable.**

Changelog Quest is an open, no-login website that turns the official Claude Code changelog and documentation into something you can understand in a few minutes:

- **Short summaries** of every release, in our own words, with nothing left out. Every release links to its section of the original changelog.
- **Plain-language feature pages**: what a feature does, why it matters, and how it works.
- **Hands-on examples**: small scripted JavaScript simulations. You type or pick something and see what the feature would do. No AI runs in your browser, and every outcome is written and reviewed in advance.

## Why

Documentation is long and sometimes tricky, and new features ship often. Developers and newcomers shouldn't have to read everything to stay current. Changelog Quest is the shortcut: the full picture of what changed and how to use it, quickly, in a clean and friendly interface.

## Status

**Phase 1: Claude Code only.** We start with one source, stabilize it, and only then add the Claude Developer Platform changelog (phase 2).

Current stage: **design and conception**.

- [x] Interactive mock-up (`mockup/`)
- [x] Data model and architecture (`docs/conception.md`)
- [x] Workspace, schemas, content validator and CI
- [ ] Ingestion pipeline (daily changelog check)
- [ ] Static website
- [ ] First public release

## Repository layout

```
schemas/             Zod schemas and shared rules (@cq/schemas)
pipeline/            Ingestion scripts and content validator (@cq/pipeline)
content/             The content, as JSON (releases, summaries, features, demos)
site/                Static website (coming)
mockup/              Interactive design mock-up
docs/
  conception.md      Data model, rules, security and build plan
  architecture.md    How the parts fit together
  decisions/         Decision records
```

## Develop

Requires Node 24. pnpm comes through Corepack.

```bash
corepack enable
pnpm install
pnpm check      # lint, typecheck, tests and content validation
```

## View the mock-up

Open `mockup/index.html` in a browser, or serve the folder locally:

```bash
npx serve mockup
```

The mock-up uses sample entries. Real content will come from the ingestion pipeline described in [`docs/conception.md`](docs/conception.md).

## Principles

- **Accurate first.** Every summary links to its source, and a release can't be published until every original changelog entry is covered.
- **Simple and fast.** Static site, no accounts, no tracking. Progress is stored only in your browser.
- **Secure by default.** No public write paths, secrets only in CI, AI output treated as untrusted text.

## Disclaimer

Changelog Quest is an independent, open-source project. It is **not affiliated with or endorsed by Anthropic**. Claude and Claude Code are products of Anthropic. Always check the [official documentation](https://docs.claude.com) for authoritative information.

## License

[MIT](LICENSE)
