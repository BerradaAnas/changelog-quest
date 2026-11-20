import { defineConfig } from "astro/config";

// Static output only: no server, no client framework (conception.md section 6).
// SITE_URL is the public address, used for canonical links and the RSS feed.
export default defineConfig({
  site: process.env.SITE_URL ?? "https://changelog-quest.pages.dev",
  output: "static",
  // Styles and scripts stay in files so the Content Security Policy needs no inline exceptions.
  build: { format: "directory", inlineStylesheets: "never" },
  vite: { build: { assetsInlineLimit: 0 } },
});
