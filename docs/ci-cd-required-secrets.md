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
5. ~~**No Sentry integration.**~~ **Fixed, and now confirmed fully live.** `@sentry/nextjs`
   wired into `next.config.mjs` + instrumentation files, `productionBrowserSourceMaps:
   false` set explicitly. `SENTRY_AUTH_TOKEN` (secret) and `SENTRY_ORG`/`SENTRY_PROJECT`
   (variables) are set on the `production` GitHub Environment. Verified on the real
   `deploy-production.yml` run #11 build log: no "no auth token" warnings, source maps
   actually uploaded ("Uploaded files to Sentry", org `facundo-guledjian`, project
   `javascript-nextjs`, release `5767237...`).
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
7. ~~**No backend API deployed anywhere.**~~ **Fixed** — see "Backend build + production
   wiring — done" below.
9. ~~**PR-preview Neon branch provisioning broken by non-empty production schema.**~~
   **Fixed.** `provision_pr_branch.mjs` forks each PR's branch from the project's default
   branch, which used to be empty (so bootstrapping fresh schema via `0001_init.sql` on
   every fork was correct) but now — since production was bootstrapped with real schema
   this session — already carries the full schema/roles/data at fork time, so re-running
   `0001_init.sql`'s raw `CREATE TYPE`/`CREATE TABLE` statements failed
   (`type "user_role" already exists`, 42710). Fixed by checking whether the forked branch
   already has the schema (`SELECT EXISTS (... FROM pg_type WHERE typname = 'user_role')`)
   and skipping `0001_init.sql` when it does; `roles.sql` was already idempotent (its
   `CREATE ROLE` is `IF NOT EXISTS`-guarded) so it always runs, but now the script also
   unconditionally `ALTER ROLE`s `app_user`'s password afterward, since `roles.sql` only
   sets the password on the create path and a forked branch inherits the role without it.
   `seed_isolation_test.sql` also hardened with `ON CONFLICT (id) DO NOTHING` on every
   insert as a defensive no-op guard (its fixed UUIDs don't actually collide with
   production's `gen_random_uuid()` rows, so this wasn't the cause of the failure, but
   makes accidental re-runs safe). Not yet re-verified against a real GitHub Actions run —
   needs a fresh PR to confirm the "Provision Neon branch + Vercel preview" job now passes.
10. **New gap found while fixing #9: PR previews still aren't wired to the real backend.**
    `pr-checks.yml`'s Vercel preview deploy still doesn't pass the per-PR Neon branch's
    connection string or a session secret into the preview build — `provision_pr_branch.mjs`
    provisions a real, now-correctly-schema'd branch, but nothing hands its connection URI
    to the deployed preview. Fixing this needs a design decision this session didn't make:
    how to inject a per-branch `DATABASE_URL` into a `--prebuilt` Vercel preview build (via
    `vercel env add ... preview <branch>`, writing into `.vercel/.env.preview.local` after
    `vercel pull`, or something else), and whether `JWT_SECRET` is shared across all
    previews or generated per-PR. Preview deploys still work as UI/a11y/layout review only;
    expect the app's own data-loading error states to render. Not started.

## External prerequisites

| # | What | Status |
|---|------|--------|
| 1 | `production` GitHub Environment, required reviewers | **Done.** Created via repo Settings UI (auto-created empty by a prior workflow run, then configured with `facuguledev` as required reviewer). `preview` Environment also exists, deliberately unprotected — preview deploys must run automatically for a PR reviewer to have something to look at. |
| 2 | Neon API key (preview-scoped) + `NEON_PROJECT_ID` | **Done.** Set in the `preview` Environment's secrets. Verified end-to-end on a real GitHub Actions run: PR #1's "Provision Neon branch + Vercel preview" job passed, including "Create Neon branch for this PR" (8s) and "Deploy Vercel preview" (1m 33s). |
| 3 | Neon API key (production-scoped) + `NEON_PROD_BRANCH_ID` | **Not yet provided.** `apply_production.mjs` is written and code-verified but has never run against real Neon — needs `NEON_PROD_API_KEY` and `NEON_PROD_BRANCH_ID` in the `production` Environment's secrets. |
| 4 | Vercel project, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | **Done.** Project `agentic-engineer-frontend` created (Root Directory `apps/frontend`), `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` known, token generated and added as a GitHub secret. Both workflows' Vercel deploy steps are real now (`npx vercel@58.7.1`, pinned), not stubs. |
| 5 | Sentry project, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`/`SENTRY_PROJECT` | **Done.** Set on the `production` Environment; confirmed uploading real source maps on run #11 (see gap #5 above). |
| 6 | Production health-check route | **Blocked on gap #6** — needs `/api/health` added to `apps/frontend`, not an external prerequisite. |
| 7 | Dedicated read-only smoke-test account/tenant | **Done.** A dedicated `ci-smoke-test` tenant + member-role user (email in `SMOKE_TEST_EMAIL`, a `production` Environment secret — knowing the email is equivalent to a credential under the current email-only auth, so it's a secret, not a variable) seeded directly in production Neon. `verify-health`'s authenticated smoke path now logs in as this account and asserts the tenant-scoped read returns the correct tenant slug. |
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

**Still `exit 1` stubs, blocking on purpose:** none currently — `verify-health`'s
authenticated smoke path was the last one and is now a real check (see below).
`emit-deploy-manifest`'s commit step already has a real bot email set (external
prerequisite #8).

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
- Verified via clean-room `npm install` + `tsc --noEmit` + `next build` + `vitest run`:
  all green. Landed as PR #10 (`feat/backend-api-routes`, commit `a9d5b8e`), CI green,
  merged to `main`.
- Neon production DB bootstrapped: roles (`app_user`, `neondb_owner`), schema
  (`0001_init.sql`, RLS enabled+forced), seed row (tenant "Facundo"/`facundo`, admin user
  `facugule@gmail.com`).
- `DATABASE_URL`, `DATABASE_OWNER_URL`, `JWT_SECRET` added as Vercel **Production**
  environment variables (Preview intentionally left out of scope — preview deploys use
  per-PR Neon branches, not yet wired to the backend; see gap #9, which blocks that
  anyway).
- `deploy-production.yml` run #11 (triggered by the PR #10 merge) completed: migration
  step applied cleanly (idempotent, no-op since schema already existed), frontend
  promoted to production, and the deploy verified live — `POST .../api/auth/login` with
  `facugule@gmail.com` returns 200 with real user data, and subsequent authenticated
  `GET /api/tenant` and `GET /api/users` return real tenant-scoped rows. The pipeline's
  `verify-health` smoke-test step still failed on its known `exit 1` stub — rollback was
  reviewed and rejected each time to keep the good deployment live, since the stub
  failure is expected, not a regression.

### Security incident — credential exposure and rotation (resolved)

The `app_user` Postgres password was briefly committed in plaintext in an earlier
version of this doc (PR #10, commit `a9d5b8e`, now on `main` — permanently in git
history). Root cause: written directly into this file during the backend build session
without realizing it would be committed. Remediation, completed:

1. Rotated the `app_user` password via the Neon Console (Roles tab → role → Reset
   password). The old password is now invalid.
2. Updated Vercel's `DATABASE_URL` **Production** environment variable with the new
   password.
3. Re-ran `deploy-production.yml` (run #12) end-to-end — migration step skipped
   correctly (no-op), frontend promoted, smoke-test failed on the same known stub
   (rollback rejected as before) — and verified live: `POST /api/auth/login` and
   `GET /api/tenant` both return 200 with real data using the new credential.

No further action needed on this incident. The password itself is never written to this
file, git, or chat — only Neon Console and Vercel's environment-variable UI hold it.

## Gap #9 fix + real smoke-test — done

Both remaining open items from the previous session are closed:

- **Gap #9** (PR-preview Neon branch provisioning broken by non-empty production schema)
  — fixed in `provision_pr_branch.mjs` and `seed_isolation_test.sql`. See gap #9 above for
  the full explanation. Surfaced a new, separate, not-yet-fixed gap while investigating:
  gap #10 (previews still don't get a real `DATABASE_URL`/`JWT_SECRET`).
- **`verify-health`'s authenticated smoke-path stub** — replaced with a real check in
  `deploy-production.yml`: logs in as the dedicated `ci-smoke-test` account
  (`SMOKE_TEST_EMAIL`, external prerequisite #7), then does a `GET /api/tenant` with the
  session cookie and asserts the returned `slug` is exactly `ci-smoke-test` — this
  specifically exercises that the RLS tenant-scoping is working, not just that some
  response came back.

Both were verified live: PR #11 merged, its "Provision Neon branch + Vercel preview" job
passed with logs confirming `0001_init.sql` was correctly skipped ("Schema already
present..."). Also fixed one more latent gap found while validating gap #9: `pr-checks.yml`'s
path filter didn't include `infra/neon/**` or its own workflow file, so a PR that only
touches the provisioning script would never actually run it.

## Gap #11 — health-check/smoke-test were silently checking the wrong URL

Running `deploy-production.yml` (run #13) to verify the new smoke-test step surfaced a
real, previously-hidden bug, unrelated to the smoke-test code itself: `vercel deploy
--prod` prints the unique per-deployment URL (e.g.
`https://agentic-engineer-frontend-8mnxjynqt-facuguledev1.vercel.app`), not the aliased
production domain — even though the deploy did get promoted/aliased correctly. That raw
per-deployment URL has Vercel Deployment Protection (SSO) enabled by default, so:

- The **health-check step was a false positive the whole time.** `curl -sf` against the
  protected URL got a 307 redirect to Vercel's SSO login page, which `curl -sf` (without
  `-L`) treats as a successful response (redirects aren't HTTP errors) — so the step
  passed on every prior run without ever actually reaching
  `apps/frontend/app/api/health/route.ts`.
- The **new authenticated smoke-test step correctly failed loud**, exactly as designed:
  `POST .../api/auth/login` against the protected URL got a real `401` with a
  `{"error":{"code":"401","message":"Protected deployment"}}` body from Vercel's edge
  layer, not the app.

Fixed in `deploy-production.yml`: the `Deploy to Vercel production` step now resolves the
deployment's actual alias via `GET https://api.vercel.com/v13/deployments/{id}`
(`.alias[0]`) right after deploying, exposes it as a new `production-url` job output, and
fails loudly if a deploy somehow has no alias. Both the health-check and smoke-test steps
now use `production-url` instead of the raw `vercel-deployment-url`. Not yet re-verified
against a real run — needs another `deploy-production.yml` trigger to confirm the
smoke-test actually passes against the real, unprotected production domain.

**Still open / possible next steps (not started, don't assume you should do these):**
- Gap #10 (PR previews don't wire a per-branch `DATABASE_URL`/`JWT_SECRET` into the
  Vercel preview build yet — needs a design decision on the injection mechanism first).
- Gap #11's fix needs one more live `deploy-production.yml` run to confirm the smoke-test
  actually passes now (not just that the URL-resolution logic is correct by inspection).

Never paste `DATABASE_OWNER_URL`, `JWT_SECRET`, or any password into chat or into this
file — only non-sensitive IDs (project/branch IDs, hostnames) are safe to share here.
