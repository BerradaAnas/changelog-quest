import type { Release, ReleaseSummary } from "@cq/schemas";
import { describe, expect, it } from "vitest";
import { feedItems, rssFeed } from "../src/lib/rss.ts";

const release = (version: string, day: string): Release => ({
  version,
  publishedAt: `2026-01-${day}T00:00:00.000Z`,
  dateSource: "npm",
  sourceUrl: "https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md",
  sourceCommit: "b".repeat(40),
  sourceHash: "a".repeat(64),
  fetchedAt: "2026-02-01T00:00:00.000Z",
  items: [{ id: `${version}#11111111`, position: 0 }],
});
const summary = (version: string, status: "draft" | "approved"): ReleaseSummary => ({
  version,
  sourceHash: "a".repeat(64),
  title: "Tags & <things>",
  headline: "Sample headline.",
  lines: [{ kind: "added", text: "Sample line.", covers: [`${version}#11111111`] }],
  classifications: { [`${version}#11111111`]: { kind: "added", featureIds: [] } },
  status,
  model: "test-model",
  promptVersion: "draft-summary-v1",
  generatedAt: "2026-02-02T00:00:00.000Z",
  ...(status === "approved" ? { approvedAt: "2026-02-03T00:00:00.000Z" } : {}),
});

describe("feedItems", () => {
  const releases = [release("1.0.1", "01"), release("1.0.3", "03"), release("1.0.2", "02")];
  const summaries = new Map([
    ["1.0.1", summary("1.0.1", "approved")],
    ["1.0.2", summary("1.0.2", "draft")],
    ["1.0.3", summary("1.0.3", "approved")],
  ]);

  it("lists approved summaries only, newest first, with release page links", () => {
    const items = feedItems(releases, summaries, "https://example.com/");
    expect(items.map((i) => i.link)).toEqual([
      "https://example.com/releases/1.0.3/",
      "https://example.com/releases/1.0.1/",
    ]);
    expect(items[0]).toMatchObject({ headline: "Sample headline.", lines: ["Sample line."] });
    expect(feedItems(releases, summaries, "https://example.com", 1)).toHaveLength(1);
  });

  it("escapes text in the XML", () => {
    const xml = rssFeed({
      title: "Feed",
      description: "Sample",
      site: "https://example.com",
      items: feedItems(releases, summaries, "https://example.com"),
    });
    expect(xml).toContain("<title>Claude Code 1.0.3: Tags &amp; &lt;things&gt;</title>");
    expect(xml).toContain('<atom:link href="https://example.com/rss.xml"');
    expect(xml.match(/<item>/g)).toHaveLength(2);
    expect(xml).toContain(
      "<description>&lt;p&gt;Sample headline.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Sample line.&lt;/li&gt;&lt;/ul&gt;</description>",
    );
  });

  it("escapes our text twice inside the description markup", () => {
    const item = {
      title: "T",
      link: "https://example.com/x",
      pubDate: "now",
      headline: "a < b",
      lines: [],
    };
    const xml = rssFeed({
      title: "Feed",
      description: "Sample",
      site: "https://example.com",
      items: [item],
    });
    expect(xml).toContain("&lt;p&gt;a &amp;lt; b&lt;/p&gt;");
  });
});
