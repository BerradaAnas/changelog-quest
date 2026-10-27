import { Release, ReleaseSummary } from "@cq/schemas";

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
