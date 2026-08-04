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
4. **No PR-scoped (branch-per-PR) Neon provisioning script.** The existing
   `apply_ephemeral.mjs` creates one throwaway branch for pentesting, not a
   long-lived-for-the-PR's-life branch keyed by PR number. Needs adapting, not reuse
   verbatim (the workflow comment says this explicitly).
5. **No Sentry integration wired into `apps/frontend/next.config.mjs`** —
   `productionBrowserSourceMaps` isn't set, no `@sentry/nextjs` build plugin.

## External prerequisites (require you to act, one at a time)

Request each credential only at the point of use — not batched. None of these are
requested yet; this list is what to expect being asked for, and why.

| # | What | Needed for | Notes |
|---|------|------------|-------|
| 1 | GitHub fine-grained PAT (`Administration:write`, `Environments:write`) OR do it by hand in Settings → Environments | Creating the `production` GitHub Environment + required-reviewers rule | This is a one-time repo setting change, deliberately **not** done via workflow YAML — the system prompt requires environment-protection changes to be a standalone human-reviewed step, never bundled into a deploy PR. Doing it by hand in the GitHub UI is arguably simpler and avoids provisioning a PAT at all. |
| 2 | Neon API key (preview-scoped) + `NEON_PROJECT_ID` | `pr-checks.yml` → `provision-preview-env` | Store as repo secrets `NEON_API_KEY`, `NEON_PROJECT_ID` under a `preview` GitHub Environment, distinct from prod. |
| 3 | Neon API key (production-scoped, minimally permissioned) | `deploy-production.yml` → `deploy-migration` | Store as `NEON_PROD_API_KEY` under the `production` Environment. Must be a different key than #2 — least privilege. |
| 4 | Vercel: project created, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and either GitHub Actions OIDC trust configured (preferred, needs `id-token: write`, already set in both workflow files) or a `VERCEL_TOKEN` fallback | Preview + production deploys in both workflows | No Vercel project exists yet per this pass — needs creating before any of this can go live. |
| 5 | Sentry: existing project or one created, `SENTRY_AUTH_TOKEN`, org slug, project slug | `deploy-production.yml` → `deploy-artifact` build step | Also needs the in-repo Sentry/Next.js wiring (gap #5 above) before this secret does anything. |
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
