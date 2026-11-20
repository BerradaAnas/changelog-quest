/**
 * Search page: queries the Pagefind index built after `astro build`. Results are rendered
 * with textContent; excerpts are parsed in an inert document and only <mark> is kept.
 */

interface PagefindResult {
  url: string;
  excerpt: string;
  meta: { title?: string };
}
interface Pagefind {
  init(): Promise<void>;
  debouncedSearch(
    query: string,
    options?: object,
    ms?: number,
  ): Promise<{ results: { data(): Promise<PagefindResult> }[] } | null>;
}

const MAX_RESULTS = 20;
const searchInput = document.querySelector<HTMLInputElement>("[data-search-input]");
const searchStatus = document.querySelector<HTMLElement>("[data-search-status]");
const searchList = document.querySelector<HTMLElement>("[data-search-results]");

function excerptNodes(html: string): Node[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return [...doc.body.childNodes].map((node) => {
    const text = node.textContent ?? "";
    if (node.nodeName !== "MARK") return document.createTextNode(text);
    const mark = document.createElement("mark");
    mark.textContent = text;
    return mark;
  });
}

async function start(input: HTMLInputElement, status: HTMLElement, list: HTMLElement) {
  let pagefind: Pagefind;
  try {
    // Built into /pagefind/ after the site build, so it does not exist for the bundler.
    const path = "/pagefind/pagefind.js";
    pagefind = (await import(/* @vite-ignore */ path)) as Pagefind;
    await pagefind.init();
  } catch {
    status.textContent =
      "Search is only available on the built site (pnpm build, then pnpm preview).";
    return;
  }

  // Each keystroke starts a run; only the newest one may touch the page.
  let latest = 0;
  const run = async () => {
    const id = ++latest;
    const query = input.value.trim();
    const url = new URL(location.href);
    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    history.replaceState(null, "", url);
    if (!query) {
      list.replaceChildren();
      status.textContent = "Type to search features and summarized releases.";
      return;
    }
    const search = await pagefind.debouncedSearch(query, {}, 200);
    if (!search || id !== latest) return; // a newer search replaced this one
    const results = await Promise.all(search.results.slice(0, MAX_RESULTS).map((r) => r.data()));
    if (id !== latest) return;
    list.replaceChildren(
      ...results.map((r) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = r.url;
        link.textContent = r.meta.title ?? r.url;
        const excerpt = document.createElement("p");
        excerpt.append(...excerptNodes(r.excerpt));
        item.append(link, excerpt);
        return item;
      }),
    );
    const total = search.results.length;
    status.textContent =
      total === 0
        ? `No results for "${query}".`
        : `${total} result${total === 1 ? "" : "s"}${total > MAX_RESULTS ? `, showing the first ${MAX_RESULTS}` : ""}.`;
  };

  input.value = new URL(location.href).searchParams.get("q") ?? "";
  input.addEventListener("input", run);
  await run();
}

if (searchInput && searchStatus && searchList) void start(searchInput, searchStatus, searchList);

export {};
