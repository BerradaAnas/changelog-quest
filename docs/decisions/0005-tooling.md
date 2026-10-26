# 0005. Tooling

Status: Accepted
Date: 2026-10-26

## Decision

- Node 24 (`.nvmrc`). Astro 7 needs Node >= 22.23.
- pnpm workspaces, pinned via `packageManager`; install with Corepack.
- TypeScript run directly: packages export `src/*.ts`, executed by `tsx`, Vitest and Vite.
  No build step for `schemas` or `pipeline`.
- Zod 4, one pinned version, shared by every package. Astro 7 depends on Zod 4 too; the site
  must reuse `@cq/schemas`, not redefine schemas.
- Vitest for tests, Biome for lint and formatting.
- GitHub Actions pinned to commit SHAs; Dependabot updates them.
