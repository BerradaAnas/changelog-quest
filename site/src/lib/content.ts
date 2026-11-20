import { Demo, Feature, Release, ReleaseSummary } from "@cq/schemas";

/**
 * Reads content/ at build time. Every file is validated again here, so a bad file fails the
 * build instead of rendering. File contents are data and are rendered as text only.
 */
const releaseFiles = import.meta.glob("../../../content/releases/*.json", {
  eager: true,
  import: "default",
});
const summaryFiles = import.meta.glob("../../../content/summaries/*.json", {
  eager: true,
  import: "default",
});

const featureFiles = import.meta.glob("../../../content/features/*.json", {
  eager: true,
  import: "default",
});
const demoFiles = import.meta.glob("../../../content/demos/*.json", {
  eager: true,
  import: "default",
});

function parseAll<T>(files: Record<string, unknown>, parse: (data: unknown) => T): T[] {
  return Object.entries(files).map(([path, data]) => {
    try {
      return parse(data);
    } catch (e) {
      throw new Error(`${path}: ${(e as Error).message}`);
    }
  });
}

export const releases = parseAll(releaseFiles, (d) => Release.parse(d));
export const summaries = new Map(
  parseAll(summaryFiles, (d) => ReleaseSummary.parse(d)).map((s) => [s.version, s]),
);
export const features = parseAll(featureFiles, (d) => Feature.parse(d));
export const demos = new Map(
  parseAll(demoFiles, (d) => Demo.parse(d)).map((d) => [d.featureId, d]),
);
export const releaseByVersion = new Map(releases.map((r) => [r.version, r]));
export const featureById = new Map(features.map((f) => [f.id, f]));

/**
 * Local preview of unapproved summaries and demos: `pnpm dev:drafts`. Dev server only: a build
 * ignores the variable, so drafts can't be published by a stray environment setting.
 */
export const includeDrafts = import.meta.env.DEV && process.env.CQ_DRAFTS === "1";

export const SITE_NAME = "Changelog Quest";
