import type { Release, ReleaseSummary } from "@cq/schemas";
import { newestFirst, visibleSummary } from "./timeline.ts";

/** RSS 2.0 feed of approved summaries. Pure; every value is escaped as text. */

export interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  headline: string;
  lines: string[];
}

const escapeXml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** The newest summarized releases, as feed items linking to their release pages. */
export function feedItems(
  releases: readonly Release[],
  summaries: ReadonlyMap<string, ReleaseSummary>,
  site: string,
  limit = 30,
): FeedItem[] {
  const base = site.replace(/\/+$/, "");
  return [...releases]
    .sort(newestFirst)
    .flatMap((r) => {
      const summary = visibleSummary(r, summaries.get(r.version));
      if (!summary) return [];
      return [
        {
          title: `Claude Code ${r.version}: ${summary.title}`,
          link: `${base}/releases/${r.version}/`,
          pubDate: new Date(r.publishedAt).toUTCString(),
          headline: summary.headline,
          lines: summary.lines.map((l) => l.text),
        },
      ];
    })
    .slice(0, limit);
}

/**
 * Readers show <description> as HTML, so it is a paragraph and a list. Each of our texts is
 * escaped into that markup, and the markup is escaped again as the element's XML text.
 */
const descriptionHtml = (item: FeedItem) =>
  `<p>${escapeXml(item.headline)}</p><ul>${item.lines.map((l) => `<li>${escapeXml(l)}</li>`).join("")}</ul>`;

export function rssFeed(channel: {
  title: string;
  description: string;
  site: string;
  items: readonly FeedItem[];
}): string {
  const base = channel.site.replace(/\/+$/, "");
  const items = channel.items.map(
    (i) => `    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${escapeXml(i.link)}</link>
      <guid isPermaLink="true">${escapeXml(i.link)}</guid>
      <pubDate>${escapeXml(i.pubDate)}</pubDate>
      <description>${escapeXml(descriptionHtml(i))}</description>
    </item>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(`${base}/`)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(`${base}/rss.xml`)}" rel="self" type="application/rss+xml" />
${items.join("\n")}
  </channel>
</rss>
`;
}
