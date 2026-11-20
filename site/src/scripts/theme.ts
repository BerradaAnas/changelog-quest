import { nextTheme } from "../lib/progress.ts";
import { loadProgress, saveProgress } from "./store.ts";

const LABELS = { system: "Theme: system", light: "Theme: light", dark: "Theme: dark" } as const;

const button = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
if (button) {
  const show = (theme: keyof typeof LABELS) => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    button.textContent = LABELS[theme];
  };
  show(loadProgress().theme);
  button.hidden = false;
  button.addEventListener("click", () => {
    const progress = loadProgress();
    const theme = nextTheme(progress.theme);
    saveProgress({ ...progress, theme });
    show(theme);
  });
}
