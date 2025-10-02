import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".",
  build: {
    outDir: "ui-dist",
    emptyOutDir: true
  },
  server: {
    open: true
  }
});
