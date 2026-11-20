// Applies the saved theme before the first paint. Loaded as a file so the CSP needs no inline script.
// The key and version must match src/lib/progress.ts; test/progress.test.ts checks both.
(() => {
  try {
    const saved = JSON.parse(localStorage.getItem("changelog-quest:progress") || "null");
    if (saved && saved.v === 1 && (saved.theme === "light" || saved.theme === "dark")) {
      document.documentElement.dataset.theme = saved.theme;
    }
  } catch {
    // No storage or unreadable data: keep the system theme.
  }
})();
