import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";

// First PR opened against this repo touching apps/frontend, specifically to
// exercise .github/workflows/pr-checks.yml end-to-end on a real GitHub
// Actions runner for the first time (validate-migration-integrity +
// ci-checks). No functional change below this comment.
const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Explicit even though false is Next's own default — per
  // agents/agent-03-devops/system-prompt.md §FRONTEND BUILD HARDENING:
  // no public source maps in the production artifact. Full maps are still
  // generated at build time and uploaded privately to Sentry below, via
  // withSentryConfig, then stripped from the public deployment.
  productionBrowserSourceMaps: false,
  // AGENT_02 scope: no auth/session logic here. API base URL is the only
  // runtime config this app owns; the authenticated client itself is
  // injected by the consuming environment (see lib/api/client.ts).
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  },
  webpack: (config) => {
    // contracts/api-specs/schema.ts (imported via the @contracts/* path
    // alias in tsconfig.json) lives outside apps/frontend and has no
    // node_modules of its own. Webpack's default bare-specifier resolution
    // walks up from the *importing file's* directory (contracts/api-specs
    // -> contracts -> repo root), none of which contain node_modules, so
    // its `import { z } from "zod"` never resolves on its own.
    //
    // Fixed here via an explicit alias to this app's own zod install,
    // rather than a root-level npm workspace — a workspace conversion
    // would touch apps/backend/package.json and a new repo-root
    // package.json, both outside AGENT_02's write scope (agents own only
    // agents/<n>/ and apps/<n>/ per the repo invariant). This keeps the
    // fix entirely inside apps/frontend.
    config.resolve.alias = {
      ...config.resolve.alias,
      zod: path.resolve(dirname, "node_modules/zod"),
    };
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG, // REPLACE_ME: set once the Sentry project exists, see docs/ci-cd-required-secrets.md
  project: process.env.SENTRY_PROJECT, // REPLACE_ME

  // Only print source-map upload logs in CI, not local dev.
  silent: !process.env.CI,

  // Pass the auth token; without it the plugin skips the upload with a
  // warning rather than failing the build — safe for local/dev builds
  // that never have SENTRY_AUTH_TOKEN set. Production deploys should
  // always have it set (see deploy-production.yml).
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a larger set of source maps for prettier stack traces.
  widenClientFileUpload: true,
});
