import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const dirname = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
      "@contracts": path.resolve(dirname, "../../contracts"),
      // Same cross-boundary resolution gap as next.config.mjs: contracts/
      // has no node_modules, so a bare "zod" import inside
      // contracts/api-specs/schema.ts doesn't resolve under Vite's default
      // walk-up-from-importer behavior either. Same fix, same rationale.
      zod: path.resolve(dirname, "node_modules/zod"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
  },
});
