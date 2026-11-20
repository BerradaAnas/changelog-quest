import type { APIRoute } from "astro";
import { releases, SITE_NAME, summaries } from "../lib/content.ts";
import { feedItems, rssFeed } from "../lib/rss.ts";

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error("set `site` in astro.config.mjs");
  const body = rssFeed({
    title: `${SITE_NAME}: Claude Code releases`,
    description: "Every Claude Code release, summarized in plain words.",
    site: site.href,
    items: feedItems(releases, summaries, site.href),
  });
  return new Response(body, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
};
