import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

export interface ContentFile {
  path: string;
  /** File name without .json; must match the entity key. */
  key: string;
  data: unknown;
}

export type Collection = "releases" | "summaries" | "features" | "demos" | "runs";
export const COLLECTIONS: readonly Collection[] = [
  "releases",
  "summaries",
  "features",
  "demos",
  "runs",
];

/** Reads every JSON file of a collection. A missing directory is an empty collection. */
export async function readCollection(root: string, collection: Collection): Promise<ContentFile[]> {
  const dir = join(root, collection);
  let names: string[];
  try {
    names = (await readdir(dir)).filter((n) => n.endsWith(".json")).sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  return Promise.all(
    names.map(async (name) => {
      const path = join(dir, name);
      const text = await readFile(path, "utf8");
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = new SyntaxError(`${(e as Error).message}`);
      }
      return { path, key: basename(name, ".json"), data };
    }),
  );
}
