// apps/backend/vitest.config.ts
//
// Explicitly scopes test discovery to tests/**. Needed because this sandbox
// has a residual node_modules.old/ directory in this folder (leftover from
// an earlier failed install, harmless/gitignored, but its name doesn't match
// vitest's default "node_modules" exclude pattern) that ships its own
// vendored test files (pg-protocol, zod's source test suite) — without this,
// `vitest run` picks those up too. Explicit include/exclude is also just
// good practice regardless of local environment quirks.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/node_modules.old/**"],
  },
});
