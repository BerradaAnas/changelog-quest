# Changelog Quest: conception

This document holds the data model, the architecture and the build plan for phase 1. It is the reference for building the project from scratch.

## 1. Purpose

Give developers and newcomers a shortcut to what's new in Claude Code. In a few minutes they should get the full picture of a release or feature and know how to use it, without reading long documentation.

The experience must be **simple, fast, easy and accessible**: clean pages, plain language, and small scripted JavaScript examples that show what a feature does.

## 2. Scope

| Phase | Covers                                           | Status                        |
| ----- | ------------------------------------------------ | ----------------------------- |
| 1     | Claude Code changelog, Claude Code features      | In progress                   |
| 2     | Claude Developer Platform changelog and features | Later, once phase 1 is stable |

## 3. Sources

| Source                                                          | What we take                       | Notes                                                                                                                            |
| --------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code `CHANGELOG.md` on GitHub (`anthropics/claude-code`) | Versions and their bullet points   | One Markdown file. Versions have no dates or titles. Read at run time only; its wording is never stored or published (ADR 0008). |
| npm registry (`@anthropic-ai/claude-code`)                      | Publish date of each version       | Reliable date source for every version.                                                                                          |
| Claude Code documentation                                       | Feature descriptions and doc links | Used for the feature catalog and doc pages.                                                                                      |

## 4. Data model

The Zod schemas in `schemas/src/` are authoritative; this section summarizes them. Changes from
the first draft are recorded in `docs/decisions/` (0001, 0002).

### 4.1 Ingested data (`content/releases/<version>.json`, never edited by hand)

Release files hold no upstream wording (ADR 0008). The text is fetched when needed
(`pnpm source show <version>`) and checked against these records by `pnpm source verify`.

```ts
Release {
  version: string            // "2.0.14", primary key and file name
  publishedAt: datetime      // npm publish time; for the few versions never on npm, the
                             // publish time of the next newer version (ADR 0009)
  dateSource: "npm" | "estimated"
  sourceUrl: string          // link to the changelog section
  sourceCommit: string       // anthropics/claude-code commit the text was read from
  sourceHash: string         // sha256 of the upstream section, detects silent edits
  fetchedAt: datetime
  items: ChangeItem[]
}

ChangeItem {
  id: string                 // "2.0.14#0a1b2c3d": hash of the normalized bullet (ADR 0001)
  position: number           // display order
}
```

### 4.2 Generated content (`content/summaries/<version>.json`, AI drafts, a human approves)

```ts
ChangeKind = "added" | "changed" | "fixed" | "removed" | "other"

ReleaseSummary {
  version: string
  sourceHash: string         // Release.sourceHash this summary was reviewed against
  title: string              // e.g. "Plugins (public beta)"
  headline: string           // one plain-language sentence
  lines: SummaryLine[]
  classifications: Record<ChangeItemId, { kind: ChangeKind, featureIds: string[] }>
                             // AI-suggested, reviewer-edited; the only item -> feature link
  status: "draft" | "approved"   // approved + merged = published
  model: string
  promptVersion: string
  generatedAt: datetime
  approvedAt?: datetime      // required when approved
}

SummaryLine {
  kind: ChangeKind
  text: string
  covers: ChangeItemId[]     // at least one
}
```

### 4.3 Editorial content (written by hand, reviewed)

```ts
Feature {                    // content/features/<id>.json
  id: string                 // slug, e.g. "hooks"
  name: string
  area: "core" | "extend" | "anywhere"
  summary: string
  what: string
  impact: { title: string, detail: string }[]
  howItWorks: string[]
  docUrls: string[]
  status: "active" | "deprecated" | "removed"
  events: FeatureEvent[]     // exactly one "introduced"; introducedIn is derived from it
}

FeatureEvent {               // powers "Update history" on a feature page
  version: string            // -> Release
  type: "introduced" | "updated" | "deprecated" | "removed"
  note: string               // related items are derived from summary classifications
}

Demo {                       // content/demos/<featureId>.json, no AI at runtime
  featureId: string
  title: string
  intro: string
  kind: "choose" | "type" | "toggle"
  inputs: { id: string, label: string, options?: string[], placeholder?: string,
            suggestions?: string[] }[]   // suggestions: one-tap examples for free-text inputs
  rules: {                   // checked in order, first match wins
    when: { input: string, equals?: string, matches?: string }[]
                             // all must hold; exactly one of equals (trimmed, case-insensitive)
                             // or matches (regex, "i" flag)
    show: { title, detail, outcome: "success" | "blocked" | "info",   // text may use {{inputId}}
            trace: { who: string, text: string, code?: boolean }[] }
  }[]
  fallback: { title: string, detail: string }
  configPreview?: string     // "{{inputId}}" placeholders, filled as plain text
  quiz: { question: string, options: string[], answerIndex: number, explanation: string }
  status: "draft" | "approved"
}
```

### 4.4 Operations

```ts
IngestRun {                  // content/runs/<date>.json, only when something changed or failed
  id: string
  startedAt: datetime
  sourceCommit: string
  newVersions: string[]
  changedVersions: string[]  // a past section whose hash changed
  status: "ok" | "failed"
  errors: string[]
}
```

### 4.5 Visitor side (browser only, never sent anywhere)

```ts
LocalProgress {              // localStorage key "changelog-quest:progress"
  v: 1                       // schema version for migrations
  tried: string[]
  quiz: Record<string, boolean>
  theme: "system" | "light" | "dark"
}
```

### 4.6 Relationships

```
Release 1──* ChangeItem
Release 1──0..1 ReleaseSummary 1──* SummaryLine *──* ChangeItem (covers)
ReleaseSummary.classifications: ChangeItem *──* Feature
Feature 1──* FeatureEvent *──1 Release
Feature 1──0..1 Demo
```

## 5. Rules

### 5.1 "Nothing lost" (checked automatically, blocks approval)

1. Every `ChangeItem` of a release is covered by at least one `SummaryLine` and has a classification.
2. Every `SummaryLine` covers at least one real `ChangeItem` of that release. The AI can't invent changes.
3. Nothing is published unless its status is `approved`.
4. If a past release's `sourceHash` changes, its summary goes back to `draft` for review. (Checked statically: an approved summary must carry its release's `sourceHash`.)
5. A line covering more than 5 items is a warning for the reviewer (ADR 0007).

All of these run in `pnpm validate`, a required CI check on every pull request.

Only our own words are published (ADR 0008). A release without an approved summary is shown as a short card: version, date, number of changes, "summary coming", and a link to its section of the original changelog on GitHub. Every summarized release links there too, with a note that all its changes are covered. Past releases get summaries newest first, in batches of 20 per review.

### 5.2 Display grouping (applied when the site is built, not stored)

Releases are grouped by calendar week (Monday to Sunday, UTC):

- **One version in a week:** shown as its own release card.
- **Two or more versions in a week:** shown as one "Week of [date]" digest card. Inside it, every version is listed with its own summary. The digest's own title and list are built from data, not generated (ADR 0007).

### 5.3 Demos

- Demos are plain JavaScript rules. No AI runs in the browser.
- Every demo is reviewed before it's published, and each rule's outcome must match the documentation.
- When a feature gets an `updated`, `deprecated` or `removed` event, its demo goes back to `draft`.
- Visitor input is only matched against rules and shown back as text. It is never executed or sent anywhere.

## 6. Architecture

"Git is the database": content lives as JSON files in this repository, and the website is static.

```
        ┌──────────────────────────────────────────────────────┐
        │ GitHub Actions (scheduled, daily)                    │
        │                                                      │
 GitHub │ 1. Fetch CHANGELOG.md + npm publish dates            │
 npm  ─▶│ 2. Parse into Release + ChangeItem JSON              │
        │ 3. For new versions: Claude API drafts the summary   │
        │ 4. Validate schemas + coverage rules                 │
        │ 5. Update the single bot/ingest PR (ADR 0006)        │
        └──────────────────────┬───────────────────────────────┘
                               │
                    You review, edit, merge
                               │
                               ▼
        ┌──────────────────────────────────────────────────────┐
        │ Static site build (Astro) -> hosting -> visitors      │
        └──────────────────────────────────────────────────────┘
```

### 6.1 Repository layout

```
content/
  releases/<version>.json       Release + ChangeItems (ingested)
  summaries/<version>.json      ReleaseSummary + classifications (generated, reviewed)
  features/<id>.json            Feature + FeatureEvents (editorial)
  demos/<featureId>.json        Demo (editorial)
  runs/<date>.json              IngestRun log
schemas/                        Zod schemas + shared pure rules (@cq/schemas)
pipeline/                       Ingestion scripts and content validator (@cq/pipeline)
site/                           Astro static site (not created yet)
mockup/                         Design mock-up
docs/                           This document, architecture.md, decisions/
```

See `docs/architecture.md` for how the parts connect.

### 6.2 Stack

| Layer       | Choice                                                    | Why                                                        |
| ----------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| Language    | TypeScript on Node 24, pnpm workspaces                    | One language for pipeline and site                         |
| Validation  | Zod 4 (one pinned version)                                | Strict schemas for all content and AI output               |
| Tests, lint | Vitest, Biome                                             | Fast, little config                                        |
| Site        | Astro                                                     | Static output, fast, little JavaScript by default          |
| Pipeline    | GitHub Actions                                            | Free for public repos, close to the code                   |
| AI          | Claude API, pinned small model (`pipeline/src/config.ts`) | Summaries are short; max tokens capped per call            |
| Hosting     | Cloudflare Pages (recommended, pending decision)          | Security headers and a preview link for every pull request |

### 6.3 Hosting comparison

|                         | GitHub Pages                                                        | Cloudflare Pages                           |
| ----------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| Price                   | Free                                                                | Free                                       |
| Traffic                 | Soft limit of 100 GB per month                                      | No bandwidth limit listed on the free plan |
| Builds                  | Soft limit of 10 per hour (not applied to custom Actions workflows) | 500 per month, one at a time               |
| Custom security headers | Not supported                                                       | `_headers` file, up to 100 rules           |
| Pull request previews   | No                                                                  | Yes                                        |
| Setup                   | Simplest                                                            | One extra account                          |

Sources: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits) (checked October 2026).

## 7. Security

- **No public write paths.** No logins, forms, database or API exposed to visitors.
- **Secrets.** The Claude API key and the ingest GitHub App key live only in GitHub Actions secrets. Workflows use least-privilege permissions (ADR 0006).
- **Untrusted text.** Changelog text and AI output are data, never instructions. They are rendered as plain text (no raw HTML), and the AI step has no tools it could be tricked into using.
- **Schema gate.** AI output that doesn't match the schema is rejected, never patched by hand.
- **Repository hygiene.** Protected `main` branch, changes only through reviewed pull requests, pinned action versions, Dependabot updates.
- **Site headers.** Content Security Policy, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Privacy.** No analytics cookies, no personal data. Visitor progress stays in their browser.

## 8. Cost

- **Hosting and CI:** free tiers.
- **Feature catalog:** written by hand with help from a normal Claude chat (subscription, no API cost). About 15 to 25 features.
- **Release summaries:** one short API call per new version with a small model. Expected to cost very little per month.

## 9. Build plan

| Step | Deliverable                                                                              | Status |
| ---- | ---------------------------------------------------------------------------------------- | ------ |
| 0    | Workspace, CI, validator, docs and Claude skills                                         | Done   |
| 1    | Zod schemas for every entity in section 4                                                | Done   |
| 2    | Changelog parser: `CHANGELOG.md` -> `Release` JSON, with fixture tests                   | Done   |
| 3    | npm date lookup and backfill of release records for all past versions                    | Done   |
| 4    | Minimal Astro site: timeline of release cards with weekly grouping and GitHub links      |        |
| 5    | Summary drafting with the Claude API; backfill newest first, 20 per review PR            |        |
| 6    | Daily GitHub Action updating the ingest PR                                               |        |
| 7    | Feature catalog seed and first demos                                                     |        |
| 8    | Full site: home, feature pages, demos, RSS feed, search (Pagefind), accessibility checks |        |
| 9    | Hosting, security headers, custom domain                                                 |        |
| 10   | Public launch of phase 1                                                                 |        |

The site moved before summaries so the data model is exercised end to end early.

## 10. Open decisions

- Hosting: Cloudflare Pages (recommended) or GitHub Pages.
- Domain name.
- Visual identity: the mock-up no longer names Anthropic's fonts, but its palette is still close to Anthropic's; the real site needs its own to support the "not affiliated" disclaimer.
- Optional: tell Anthropic about the project. Not required, since nothing of theirs is copied (ADR 0008).
