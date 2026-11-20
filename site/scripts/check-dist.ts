import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import axe from "axe-core";
import { JSDOM } from "jsdom";

/**
 * Checks the built site (run after `pnpm build`):
 * - accessibility rules from axe-core on every page type (release pages are sampled);
 * - nothing inline that the Content Security Policy in public/_headers would block.
 * Colour contrast can't be measured without a real browser; test/contrast.test.ts covers the
 * palette instead.
 */

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const RELEASE_SAMPLE = 8;

async function htmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "pagefind") out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith(".html")) out.push(path);
  }
  return out.sort();
}

function inlineProblems(document: Document): string[] {
  const problems: string[] = [];
  for (const script of document.querySelectorAll("script")) {
    if (!script.src && script.textContent?.trim()) problems.push("inline <script>");
  }
  if (document.querySelector("style")) problems.push("inline <style>");
  if (document.querySelector("[style]")) problems.push("style attribute");
  for (const el of document.querySelectorAll("*")) {
    for (const attr of el.attributes) {
      if (attr.name.startsWith("on")) problems.push(`inline handler ${attr.name}`);
    }
  }
  return problems;
}

async function main() {
  const all = await htmlFiles(DIST).catch((e: NodeJS.ErrnoException) => {
    if (e.code === "ENOENT") return [];
    throw e;
  });
  const isRelease = (f: string) => relative(DIST, f).startsWith("releases/");
  if (all.length === 0) throw new Error(`no HTML in ${DIST}; run pnpm build first`);
  // Release pages come in two shapes, summarized or not: sample each.
  const sample = (files: string[]) => {
    const step = Math.max(1, Math.ceil(files.length / RELEASE_SAMPLE));
    return files.filter((_, n) => n % step === 0);
  };
  const summarized: string[] = [];
  const pending: string[] = [];

  let failures = 0;
  for (const file of all) {
    const { document } = new JSDOM(await readFile(file, "utf8")).window;
    if (isRelease(file)) (document.querySelector(".kind-title") ? summarized : pending).push(file);
    for (const problem of inlineProblems(document)) {
      console.log(`✗ ${relative(DIST, file)}: ${problem} (blocked by the CSP)`);
      failures++;
    }
  }
  const pages = [...all.filter((f) => !isRelease(f)), ...sample(summarized), ...sample(pending)];
  for (const file of pages) {
    const dom = new JSDOM(await readFile(file, "utf8"), { runScripts: "outside-only" });
    dom.window.eval(axe.source);
    const results = await (dom.window as unknown as { axe: typeof axe }).axe.run(
      dom.window.document,
      { rules: { "color-contrast": { enabled: false } } },
    );
    for (const v of results.violations) {
      const where = v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 3)
        .join("; ");
      console.log(`✗ ${relative(DIST, file)}: ${v.id}: ${v.help} (${where})`);
      failures++;
    }
  }
  console.log(
    `${all.length} pages checked for inline code, ${pages.length} for accessibility: ${failures} problem(s)`,
  );
  if (failures > 0) process.exitCode = 1;
}

await main();
