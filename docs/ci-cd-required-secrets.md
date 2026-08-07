# CI/CD prerequisites — status

Originally authored by AGENT_03 against the committed state of `apps/backend`,
`apps/frontend`, and `contracts/api-specs` (commits `451c3be`, `cc47276`, `74be6c2`).
Updated as pieces have gone live. `.github/workflows/pr-checks.yml` and
`.github/workflows/deploy-production.yml` are written to fail loudly (`exit 1` with an
`::error::` message) at every point that still depends on something unresolved, rather
than silently no-op or fake success.

## Code gaps found along the way

1. ~~**`apps/frontend/package.json` had `"a11y": "node scripts/axe-audit.mjs"` but the
   script didn't exist.**~~ **Fixed.** Script exists, passes on a real GitHub Actions
   runner as of commit `d328a2c` on `ci/validate-pr-checks` (after also fixing a missing
   Playwright `chromium-headless-shell` binary and an `@axe-core/playwright` v4.3+ API
   change — see that branch's commit history for both).
2. ~~**No `test` script in either package.json.**~~ **Fixed.** Both have real `vitest`
   suites now; confirmed passing on a real runner.
3. ~~**No production migration-apply script.**~~ **Fixed.** `infra/neon/apply_production.mjs`
   written: no branch create/delete capability at all, independently re-verifies the
   migration checksum against the manifest, idempotent via a self-maintained
   `_migrations_applied` tracking table, transactional apply. Code-verified against a
   clean copy (checksum pass + tamper-detection fail cases both confirmed). Not yet run
   on a real runner — blocked on `NEON_PROD_API_KEY` / `NEON_PROD_BRANCH_ID` (see external
   prerequisites #3).
4. ~~**No PR-scoped Neon provisioning script.**~~ **Fixed.**
   `infra/neon/provision_pr_branch.mjs` + `teardown_pr_branch.mjs`, wired into
   `pr-checks.yml`. Verified: dependency install, all env-var/argument guards, and the
   Neon API call path (confirmed via `curl` getting a real `401` from a fake key — proves
   the endpoint/auth format, since this dev sandbox's proxy setup blocks Node's own
   `fetch()` from completing the call; not an issue on a GitHub-hosted runner).
5. ~~**No Sentry integration.**~~ **Fixed.** `@sentry/nextjs` wired into
   `next.config.mjs` + instrumentation files, `productionBrowserSourceMaps: false` set
   explicitly. Verified with a real clean-copy `npm install` + `next build`: succeeds,
   Sentry code present in compiled output, zero `.map` files under `.next/static`.
6. **No `/api/health` route in `apps/frontend`.** New gap, found while wiring
   `verify-health`. There's no backend deployed anywhere (see #7), so there's nothing to
   health-check yet even on the frontend's own terms — `verify-health`'s health-check
   step now points at the real deployed URL but will legitimately fail with a 404 until
   this route exists. That's intentional: a real failure beats a hardcoded stub.
7. **No backend API deployed anywhere.** `apps/backend` is schema/migrations only (no
   HTTP server, no route handlers) — `NEXT_PUBLIC_API_BASE_URL` has nothing real to point
   at. Consequence: the Neon branch `provision_pr_branch.mjs` creates for each PR preview
   is provisioned but currently unused by the deployed frontend (nothing to hand its
   connection string to), and `verify-health`'s authenticated smoke-path step can't be
   implemented until both a backend and auth exist. Preview/production deploys still work
   as UI/layout/a11y review; expect the app's own data-loading error states to render.

## External prerequisites

| # | What | Status |
|---|------|--------|
| 1 | `production` GitHub Environment, required reviewers | **Done.** Created via repo Settings UI (auto-created empty by a prior workflow run, then configured with `facuguledev` as required reviewer). `preview` Environment also exists, deliberately unprotected — preview deploys must run automatically for a PR reviewer to have something to look at. |
| 2 | Neon API key (preview-scoped) + `NEON_PROJECT_ID` | **Done.** Set in the `preview` Environment's secrets. Verified end-to-end on a real GitHub Actions run: PR #1's "Provision Neon branch + Vercel preview" job passed, including "Create Neon branch for this PR" (8s) and "Deploy Vercel preview" (1m 33s). |
| 3 | Neon API key (production-scoped) + `NEON_PROD_BRANCH_ID` | **Not yet provided.** `apply_production.mjs` is written and code-verified but has never run against real Neon — needs `NEON_PROD_API_KEY` and `NEON_PROD_BRANCH_ID` in the `production` Environment's secrets. |
| 4 | Vercel project, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | **Done.** Project `agentic-engineer-frontend` created (Root Directory `apps/frontend`), `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` known, token generated and added as a GitHub secret. Both workflows' Vercel deploy steps are real now (`npx vercel@58.7.1`, pinned), not stubs. |
| 5 | Sentry project, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`/`SENTRY_PROJECT` | **Not yet provided.** In-repo wiring is done; build succeeds without these, source maps just won't upload until they're real. |
| 6 | Production health-check route | **Blocked on gap #6** — needs `/api/health` added to `apps/frontend`, not an external prerequisite. |
| 7 | Dedicated read-only smoke-test account/tenant | **Blocked on gap #7** — no backend/auth exists yet to create an account against. |
| 8 | Bot identity email for `git config user.email` in `emit-deploy-manifest` | **Done.** Set to the repo owner's email. |

## What's real now vs. still a stub

**Real, verified on a live GitHub Actions run:** migration checksum validation, full CI
suite (lint/typecheck/test/a11y) for both apps, Neon branch-per-PR provisioning
(`provision_pr_branch.mjs`, run against real credentials, real branch created), Vercel
preview deploy (real `npx vercel@58.7.1 pull/build/deploy`, real deployment URL, PR
comment posted) — all on PR #1's `ci/validate-pr-checks` branch. Sentry/Next.js build
wiring verified via clean-copy build (not yet against real Sentry credentials).

**Written and code-verified, not yet run on a real runner:** `apply_production.mjs`
(blocked on prod Neon credentials), `deploy-production.yml`'s Vercel production deploy
and rollback steps (blocked on a merge to `main`, since that workflow only triggers on
push to `main`), `teardown_pr_branch.mjs` (blocked on closing PR #1).

**Still `exit 1` stubs, blocking on purpose:** `verify-health`'s authenticated smoke path
(no backend/auth), `emit-deploy-manifest`'s commit step (no real bot email set).

**Known gap, not yet a stub because nothing references it as blocking:** `/api/health`
doesn't exist, so `verify-health`'s health-check step will run for real and fail with a
404 rather than being hand-blocked.
