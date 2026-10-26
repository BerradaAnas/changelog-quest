# Changelog Quest: conception

This document holds the data model, the architecture and the build plan for phase 1. It is the reference for building the project from scratch.

## 1. Purpose

Give developers and newcomers a shortcut to what's new in Claude Code. In a few minutes they should get the full picture of a release or feature and know how to use it, without reading long documentation.

The experience must be **simple, fast, easy and accessible**: clean pages, plain language, and small scripted JavaScript examples that show what a feature does.

## 2. Scope

| Phase | Covers | Status |
|---|---|---|
| 1 | Claude Code changelog, Claude Code features | In progress |
| 2 | Claude Developer Platform changelog and features | Later, once phase 1 is stable |

## 3. Sources

| Source | What we take | Notes |
|---|---|---|
| Claude Code `CHANGELOG.md` on GitHub (`anthropics/claude-code`) | Versions and their bullet points | One Markdown file. Versions have no dates or titles. |
| npm registry (`@anthropic-ai/claude-code`) | Publish date of each version | Reliable date source for every version. |
| Claude Code documentation | Feature descriptions and doc links | Used for the feature catalog and doc pages. |

## 4. Data model

TypeScript notation. Every entity is validated with a schema (Zod) before it is saved or published.

### 4.1 Ingested data (source of truth, never edited by hand)

```ts
Release {
  version: string            // "2.0.14", primary key
  publishedAt: datetime      // from the npm registry
  sourceUrl: string          // link to the changelog section
  sourceHash: string         // hash of the raw section, detects silent edits
  rawMarkdown: string        // exact original text
  fetchedAt: datetime
}

ChangeItem {
  id: string                 // "2.0.14#3" (version + bullet position)
  version: string            // -> Release
  position: number
  rawText: string            // the original bullet, word for word
  kind: "added" | "changed" | "fixed" | "removed" | "other"   // AI-classified, reviewer can override
  featureIds: string[]       // -> Feature (can be empty)
}
```

### 4.2 Generated content (AI drafts, a human approves)

```ts
ReleaseSummary {
  version: string            // -> Release (one per release)
  title: string              // e.g. "Plugins (public beta)"
  headline: string           // one plain-language sentence
  lines: SummaryLine[]
  status: "draft" | "approved" | "published"
  model: string              // which Claude model wrote it
  promptVersion: string      // which prompt template, so results can be reproduced
  generatedAt: datetime
  approvedAt?: datetime
}

SummaryLine {
  kind: "added" | "changed" | "fixed" | "removed"
  text: string
  covers: string[]           // ChangeItem ids this line summarizes
}
```

### 4.3 Editorial content (written by hand, reviewed)

```ts
Feature {
  id: string                 // slug, e.g. "hooks"
  name: string
  area: "core" | "extend" | "anywhere"
  summary: string
  what: string
  impact: { title: string, detail: string }[]
  howItWorks: string[]
  docUrls: string[]
  status: "active" | "deprecated" | "removed"
  introducedIn: string       // -> Release version
}

FeatureEvent {               // powers "Update history" on a feature page
  featureId: string
  version: string
  type: "introduced" | "updated" | "deprecated" | "removed"
  note: string
  changeItemIds: string[]
}

Demo {                       // scripted JavaScript simulation, no AI at runtime
  featureId: string
  title: string
  intro: string
  kind: "choose" | "type" | "toggle"       // how the visitor interacts
  inputs: { id: string, label: string, options?: string[], placeholder?: string }[]
  rules: {                                 // checked in order, first match wins
    when: { input: string, equals?: string, matches?: string }[]  // all conditions must hold
    show: {
      title: string
      detail: string
      outcome: "success" | "blocked" | "info"
      trace: { who: string, text: string, code?: boolean }[]      // step-by-step playback
    }
  }[]
  fallback: { title: string, detail: string }   // shown when nothing matches
  configPreview?: string     // template for the "your settings file" snippet
  quiz: { question: string, options: string[], answerIndex: number, explanation: string }
  status: "draft" | "approved"
}
```

### 4.4 Operations

```ts
IngestRun {                  // audit log of every pipeline run
  id: string
  startedAt: datetime
  newVersions: string[]
  changedVersions: string[]  // a past section whose hash changed
  status: "ok" | "failed"
  errors: string[]
}
```

### 4.5 Visitor side (browser only, never sent anywhere)

```ts
LocalProgress {              // stored in localStorage
  tried: string[]            // feature ids
  quiz: Record<string, boolean>
  theme: "system" | "light" | "dark"
}
```

### 4.6 Relationships

```
Release 1──* ChangeItem *──* Feature
Release 1──1 ReleaseSummary 1──* SummaryLine *──* ChangeItem (covers)
Feature 1──* FeatureEvent *──1 Release
Feature 1──0..1 Demo
```

## 5. Rules

### 5.1 "Nothing lost" (checked automatically, blocks approval)

1. Every `ChangeItem` of a release is covered by at least one `SummaryLine`.
2. Every `SummaryLine` covers at least one real `ChangeItem` of that release. The AI can't invent changes.
3. Nothing is published unless its status is `approved`.
4. If a past release's `sourceHash` changes, its summary goes back to `draft` for review.

### 5.2 Display grouping (applied when the site is built, not stored)

Releases are grouped by calendar week (Monday to Sunday, UTC):

- **One version in a week:** shown as its own release card.
- **Two or more versions in a week:** shown as one "Week of [date]" digest card. Inside it, every version is listed with its own summary.

### 5.3 Demos

- Demos are plain JavaScript rules. No AI runs in the browser.
- Every demo is reviewed before it's published, and each rule's outcome must match the documentation.
- Visitor input is only matched against rules and shown back as text. It is never executed or sent anywhere.

## 6. Architecture

"Git is the database": content lives as JSON files in this repository, and the website is static.

```
        ┌──────────────────────────────────────────────────────┐
        │ GitHub Actions (scheduled, daily)                     │
        │                                                      │
 GitHub │ 1. Fetch CHANGELOG.md + npm publish dates            │
 npm  ─▶│ 2. Parse into Release + ChangeItem JSON              │
        │ 3. For new versions: Claude API drafts the summary   │
        │ 4. Validate schemas + coverage rules                 │
        │ 5. Open a pull request with the drafts               │
        └──────────────────────┬───────────────────────────────┘
                               │
                    You review, edit, merge
                               │
                               ▼
        ┌──────────────────────────────────────────────────────┐
        │ Static site build (Astro) -> hosting -> visitors      │
        └──────────────────────────────────────────────────────┘
```

### 6.1 Planned repository layout

```
content/
  releases/<version>.json       Release + ChangeItems (ingested)
  summaries/<version>.json      ReleaseSummary (generated, reviewed)
  features/<id>.json            Feature + FeatureEvents (editorial)
  demos/<id>.json               Demo (editorial)
  runs/<date>.json              IngestRun log
pipeline/                       Ingestion scripts (TypeScript)
schemas/                        Zod schemas shared by pipeline and site
site/                           Astro static site
mockup/                         Design mock-up
docs/                           This document and later docs
```

### 6.2 Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript | One language for pipeline and site |
| Validation | Zod | Strict schemas for all content and AI output |
| Site | Astro | Static output, fast, little JavaScript by default |
| Pipeline | GitHub Actions | Free for public repos, close to the code |
| AI | Claude API, small model (Haiku class) | Summaries are short; keeps cost very low |
| Hosting | Cloudflare Pages (recommended, pending decision) | Security headers and a preview link for every pull request |

### 6.3 Hosting comparison

| | GitHub Pages | Cloudflare Pages |
|---|---|---|
| Price | Free | Free |
| Traffic | Soft limit of 100 GB per month | No bandwidth limit listed on the free plan |
| Builds | Soft limit of 10 per hour (not applied to custom Actions workflows) | 500 per month, one at a time |
| Custom security headers | Not supported | `_headers` file, up to 100 rules |
| Pull request previews | No | Yes |
| Setup | Simplest | One extra account |

Sources: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits) (checked October 2026).

## 7. Security

- **No public write paths.** No logins, forms, database or API exposed to visitors.
- **Secrets.** The Claude API key lives only in GitHub Actions secrets. Workflows use least-privilege `GITHUB_TOKEN` permissions.
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

| Step | Deliverable |
|---|---|
| 1 | Zod schemas for every entity in section 4 |
| 2 | Changelog parser: `CHANGELOG.md` -> `Release` + `ChangeItem` JSON, with tests |
| 3 | npm date lookup and backfill of all past versions |
| 4 | Summary drafting with the Claude API + coverage checker |
| 5 | Daily GitHub Action that opens a pull request |
| 6 | Feature catalog seed (hand-written) and first demos |
| 7 | Astro site: home, release timeline with weekly grouping, feature pages, demos |
| 8 | Hosting, security headers, custom domain |
| 9 | Public launch of phase 1 |

## 10. Open decisions

- Hosting: Cloudflare Pages (recommended) or GitHub Pages.
- Domain name.
