import { config } from "./config.ts";

/** Publish time of every version of the package, from the npm registry. */
export async function fetchPublishDates(
  pkg: string = config.npmPackage,
): Promise<Map<string, string>> {
  const url = `https://registry.npmjs.org/${pkg.replace("/", "%2f")}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
  const doc = (await res.json()) as { time?: Record<string, string> };
  return publishDates(doc.time ?? {});
}

/** The registry's `time` object also holds "created" and "modified"; keep versions only. */
export function publishDates(time: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(time).filter(([key]) => /^\d+\.\d+\.\d+/.test(key)));
}
