# CI/CD prerequisites — status as of this authoring pass

Authored by AGENT_03 against the committed state of `apps/backend`, `apps/frontend`,
and `contracts/api-specs` (commits `451c3be`, `cc47276`, `74be6c2`). Nothing below has
been provisioned live. `.github/workflows/pr-checks.yml` and
`.github/workflows/deploy-production.yml` are written to fail loudly (`exit 1` with an
`::error::` message) at every point that depends on one of these, rather than silently
no-op or fake success.

## Code gaps found during this pass (not infra — fix in-repo first)

1. **`apps/frontend/package.json` has `"a11y": "node scripts/axe-audit.mjs"` but
   `apps/frontend/scripts/axe-audit.mjs` does not exist.** `@axe-core/playwright` and
   `playwright` are devDependencies, so the intent is real, the script just was never
   written/committed. `pr-checks.yml` blocks on this by name instead of skipping it.
2. **No `test` script in either `apps/backend/package.json` or
   `apps/frontend/package.json`.** Both workflows block on this explicitly. Either add
   a real test suite + script, or make an explicit, documented decision that none
   exists yet — but that decision shouldn't be made silently inside a CI file.
3. **No production migration-apply script.** `infra/neon/apply_ephemeral.mjs`
   explicitly never touches production by design (see its own header comment) — a
   separate `apply_production.mjs` needs to be written, scoped to applying exactly one
   checksum-verified migration, never drop/reset.
4. ~~**No PR-scoped (branch-per-PR) Neon provisioning script.**~~ **Fixed.**
   `infra/neon/provision_pr_branch.mjs` + `teardown_pr_branch.mjs` now exist, wired into
   `pr-checks.yml`'s `provision-preview-env`/`cleanup-preview-env` jobs. Verified:
   argument/env-var guards tested directly, and the Neon API call path confirmed working
   (a `curl` request with a fake key got a real `401` from `console.neon.tech`) — the
   only thing untested end-to-end is a real branch create/apply/seed cycle, which needs
   a real `NEON_API_KEY`.
5. ~~**No Sentry integration wired into `apps/frontend/next.config.mjs`**~~ **Fixed.**
   `@sentry/nextjs` added, `next.config.mjs` wrapped with `withSentryConfig`,
   `productionBrowserSourceMaps: false` set explicitly, plus
   `instrumentation.ts`/`instrumentation-client.ts`/`sentry.server.config.ts`/
   `sentry.edge.config.ts`/`app/global-error.tsx` all added per Sentry's current Next.js
   15 App Router manual-setup docs. Verified with a real `npm install` + `next build` in
   a clean copy: build succeeds, `instrumentation.js` and Sentry code are present in the
   compiled output, and no `.map` files ship under `.next/static` (confirms no public
   source maps). Still needs a real Sentry project/org/project slug/auth token before
   maps actually upload anywhere — until then the build just skips the upload with a
   warning, which is the documented, safe default behavior.

## External prerequisites (require you to act, one at a time)

Request each credential only at the point of use — not batched. None of these are
requested yet; this list is what to expect being asked for, and why.

| # | What | Needed for | Notes |
|---|------|------------|-------|
| 1 | GitHub fine-grained PAT (`Administration:write`, `Environments:write`) OR do it by hand in Settings → Environments | Creating the `production` GitHub Environment + required-reviewers rule | This is a one-time repo setting change, deliberately **not** done via workflow YAML — the system prompt requires environment-protection changes to be a standalone human-reviewed step, never bundled into a deploy PR. Doing it by hand in the GitHub UI is arguably simpler and avoids provisioning a PAT at all. |
| 2 | Neon API key (preview-scoped) + `NEON_PROJECT_ID` | `pr-checks.yml` → `provision-preview-env` | Script side is done (`infra/neon/provision_pr_branch.mjs`). Store as repo secrets `NEON_API_KEY`, `NEON_PROJECT_ID` under a `preview` GitHub Environment, distinct from prod. |
| 3 | Neon API key (production-scoped, minimally permissioned) | `deploy-production.yml` → `deploy-migration` | Store as `NEON_PROD_API_KEY` under the `production` Environment. Must be a different key than #2 — least privilege. Still needs `apply_production.mjs` written (gap #3 above, still open). |
| 4 | Vercel: project created, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and either GitHub Actions OIDC trust configured (preferred, needs `id-token: write`, already set in both workflow files) or a `VERCEL_TOKEN` fallback | Preview + production deploys in both workflows | No Vercel project exists yet per this pass — needs creating before any of this can go live. |
| 5 | Sentry: existing project or one created, `SENTRY_AUTH_TOKEN`, org slug (`SENTRY_ORG` repo variable), project slug (`SENTRY_PROJECT` repo variable) | `deploy-production.yml` → `deploy-artifact` build step | In-repo wiring is done (gap #5 above, fixed). Build succeeds without these set; source maps just won't upload until they're real. |
| 6 | Production domain / health-check URL | `deploy-production.yml` → `verify-health` | Currently a `REPLACE_ME` placeholder — depends on #4 existing first. |
| 7 | A dedicated read-only smoke-test account/tenant | `verify-health`'s authenticated smoke path | Must not reuse a real tenant's credentials. |
| 8 | Bot identity email for `git config user.email` | `emit-deploy-manifest`'s commit step | Currently `REPLACE_ME@example.com` — pick something that won't misattribute authorship, per the system prompt's explicit rule. |

## Network reachability

Not yet checked from a CI runner context. Before requesting any of the above, worth
confirming `api.github.com`, `vercel.com`, `api.vercel.com`, `sentry.io` are reachable
from wherever the provisioning calls will actually run (this differs from reachability
in this chat session, which isn't representative of a GitHub-hosted runner).

## What's deliberately NOT done in this pass

- No secrets requested or stored.
- No GitHub Environment created.
- No Vercel/Neon/Sentry project created.
- No PR opened. Workflow files are sitting in the working tree, uncommitted — review
  them first, since several jobs are stubs by design (`exit 1` placeholders) and
  wouldn't pass CI as-is even after secrets are filled in.
