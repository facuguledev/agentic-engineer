import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

export default nextConfig;
