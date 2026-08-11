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
6. ~~**No `/api/health` route in `apps/frontend`.**~~ **Fixed.**
   `apps/frontend/app/api/health/route.ts` added — liveness check only (confirms the
   Next.js server is up), deliberately not a deep dependency check since there's still
   no backend to probe (see #7). `force-dynamic` so it always reflects the live server,
   not a build-time value. Test added and verified via a clean-copy `next build` +
   `vitest run`: route compiles as a dynamic route, all 14 frontend tests pass.
7b. ~~**Vercel's native Git integration was deploying in parallel to our own CLI-driven
   deploys.**~~ **Fixed.** Added `apps/frontend/vercel.json` with
   `"git": { "deploymentEnabled": false }`, per Vercel's own documented guidance for the
   Actions + CLI `--prebuilt` pattern. Without this, every push to `main` triggered two
   independent production deployments (ours via `deploy-production.yml`, and Vercel's own
   auto-deploy from the GitHub connection) — confirmed live as the root cause of a
   `vercel rollback` failing with `402: To rollback further than the previous production
   deployment, upgrade to pro`, since the two interleaved deployment histories made
   "the previous deployment" ambiguous between what our API query resolved and what
   Vercel's Hobby-plan rollback actually allows.
7. ~~**No backend API deployed anywhere.**~~ **Fixed.** Full backend implemented as
   Next.js Route Handlers in `apps/frontend/app/api/**` (auth/login, auth/logout, tenant,
   users, users/[userId], projects, projects/[projectId], projects/[projectId]/tasks,
   tasks, tasks/[taskId]), conforming to `contracts/api-specs/schema.ts`. RLS-safe via
   `lib/db/pool.ts`'s `withTenant` helper (session-scoped `app.current_tenant_id`) plus a
   separate identity pool for the login route only. JWT session cookies via `jose`.
   Merged via PR #10, deployed to production (`deploy-production.yml` run #11), and
   verified end-to-end live: `POST /api/auth/login` with the seeded admin account returns
   200 and a real user row, and subsequent `GET /api/tenant` / `GET /api/users` calls
   (using the session cookie) return real tenant-scoped data from production Neon.
9. **New gap found while deploying #10**: `infra/neon/provision_pr_branch.mjs` now fails
   for new PRs (`error: type "user_role" already exists`, code `42710`). Root cause: the
   script forks a fresh Neon branch off `production` and then re-runs the full migration,
   which assumes the branch starts empty — true when production had no schema, false now
   that production has a real schema (this session). Preview branches/deploys are broken
   until this is fixed (e.g. make the migration step idempotent the same way
   `apply_production.mjs` already is, via a `_migrations_applied` tracking table, or skip
   re-running schema-creation DDL when forking from a non-empty parent branch). Does not
   block production deploys — confirmed by merging PR #10 straight to `main` despite this
   job failing, since it isn't a required check.

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

**Real, verified on a live GitHub Actions production run (`deploy-production.yml`,
2 real end-to-end runs so far):** migration checksum validation (skips correctly when no
migration changed — confirmed this cascades a `success()` transitive-ancestor skip bug
into downstream jobs, since fixed), Vercel production deploy, `/api/health` (added this
session, health-check step now hits a real 200 instead of a 404), and — the big one —
automated rollback, confirmed actually repointing traffic via the Vercel API (previous
`vercel rollback` with no args was silently a no-op; fixed to resolve and pass the real
previous deployment explicitly).

## Backend build + production wiring — done

Gap #7 (backend) is closed. Summary of how it landed:

- Full backend written as Next.js Route Handlers inside `apps/frontend/app/api/**`,
  conforming to `contracts/api-specs/schema.ts`. RLS-safe via `lib/db/pool.ts`'s
  `withTenant` helper + a separate identity pool for the login route only.
  `lib/auth/session.ts` issues JWT session cookies via `jose`.
- Code was written directly in the local checkout but never committed/pushed
  (OneDrive-mounted repo has git locking issues from the sandbox side — commits had to
  be run by the user locally in PowerShell). Landed as PR #10
  (`feat/backend-api-routes`, commit `a9d5b8e`), CI green (typecheck/lint/test/a11y —
  14/14 tests passing), merged to `main`.
- Neon production DB bootstrapped: roles (`app_user`, `neondb_owner`), schema
  (`0001_init.sql`, RLS enabled+forced), seed row (tenant "Facundo"/`facundo`, admin user
  `facugule@gmail.com`).
- `DATABASE_URL`, `DATABASE_OWNER_URL`, `JWT_SECRET` added as Vercel **Production**
  environment variables (Preview intentionally left out of scope — preview deploys use
  per-PR Neon branches, not yet wired to the backend; see gap #9 above, which blocks that
  anyway).
- `deploy-production.yml` run #11 (triggered by the PR #10 merge) completed: migration
  step applied cleanly (idempotent, no-op since schema already existed), frontend
  promoted to production, and the deploy verified live —
  `POST https://agentic-engineer-frontend-facuguledev1.vercel.app/api/auth/login` with
  `facugule@gmail.com` returns 200 with real user data, and subsequent authenticated
  `GET /api/tenant` and `GET /api/users` return real tenant-scoped rows. The pipeline's
  `verify-health` smoke-test step still failed on its known `exit 1` stub (see gap #7's
  note above) — rollback was reviewed and rejected each time to keep the good deployment
  live, since the stub failure is expected, not a regression.

**Still open / possible next steps (not started, don't assume you should do these):**
- Gap #9 (PR-preview Neon branch provisioning broken by non-empty production schema).
- Optionally replace `verify-health`'s hardcoded `exit 1` "Authenticated smoke path" stub
  with a real login+read check now that auth exists.
- `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT` still not provided (gap in table
  above, #5) — source maps aren't uploading yet.

Never paste `DATABASE_OWNER_URL`, `JWT_SECRET`, or any password into chat — only
non-sensitive IDs (project/branch IDs, hostnames) are safe to share here.
