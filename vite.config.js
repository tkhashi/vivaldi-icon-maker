import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  plugins: [react()],
  root: ".",
  base: isGitHubActions ? "./" : "/",
  build: {
    outDir: "ui-dist",
    emptyOutDir: true
  },
  server: {
    open: true
  }
});
