import { loadProgress } from "./store.ts";

/** Marks feature cards the visitor has already tried. */
const progress = loadProgress();
for (const badge of document.querySelectorAll<HTMLElement>("[data-progress-for]")) {
  const id = badge.dataset.progressFor ?? "";
  const label = progress.tried.includes(id) ? "Tried" : "";
  if (label) {
    badge.textContent = label;
    badge.hidden = false;
  }
}
