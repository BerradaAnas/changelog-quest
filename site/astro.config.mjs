import { defineConfig } from "astro/config";

// Static output only: no server, no client framework (conception.md section 6).
export default defineConfig({
  output: "static",
  build: { format: "directory" },
});
