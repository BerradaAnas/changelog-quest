# 0011. Host on Cloudflare Pages

Status: Accepted
Date: 2026-11-15

## Context

Hosting was an open decision between GitHub Pages and Cloudflare Pages (conception.md 6.3).
The site's security section asks for a Content Security Policy and other response headers,
which GitHub Pages cannot send.

## Decision

- The site is hosted on Cloudflare Pages: build command `pnpm build`, output `site/dist`.
- Security headers live in `site/public/_headers`.
- Until a custom domain is chosen, the public address is the project's `pages.dev` address,
  which is the default of `SITE_URL` in `site/astro.config.mjs`.

## Consequences

- One extra account (Cloudflare) besides GitHub.
- Pull requests get preview deployments.
- Choosing a domain later means setting `SITE_URL` and adding the domain in Cloudflare; no
  code change.
