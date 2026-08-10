#!/usr/bin/env node
// infra/neon/provision_pr_branch.mjs
// AGENT_03 — PROVISION_PREVIEW_ENV (Neon half).
//
// Adapted from AGENT_01's apply_ephemeral.mjs (single throwaway branch per
// pentest run) into a PR-scoped equivalent: one branch per PR, named
// `pr-<number>`, that persists for the PR's lifetime and is torn down by
// teardown_pr_branch.mjs when the PR closes (see pr-checks.yml's
// cleanup-preview-env job).
//
// Deliberately NOT reused verbatim from apply_ephemeral.mjs:
//   - No curl/SOCKS proxy workaround. That existed only because AGENT_01's
//     dev sandbox had no direct outbound TCP. GitHub-hosted runners have
//     normal network access, so this uses `pg` and global `fetch` directly.
//   - Idempotent per PR: if a branch named pr-<number> already exists (e.g.
//     from a previous push to the same PR), it is deleted and recreated
//     fresh rather than reused, so preview data never drifts across pushes.
//   - Never touches a production branch. The only branch this script will
//     ever create, reset, or delete is named `pr-<number>` — enforced by a
//     hard assertion before any destructive call.
//
// Requires: NEON_API_KEY, NEON_PROJECT_ID, PR_NUMBER env vars.
// On GitHub Actions, also expects GITHUB_OUTPUT to be set (standard).
//
// Usage: NEON_API_KEY=... NEON_PROJECT_ID=... PR_NUMBER=42 node provision_pr_branch.mjs

import pg from "pg";
const { Client } = pg;
import { readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://console.neon.tech/api/v2";

const NEON_API_KEY = process.env.NEON_API_KEY;
const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID;
const PR_NUMBER = process.env.PR_NUMBER;

if (!NEON_API_KEY) throw new Error("NEON_API_KEY is required");
if (!NEON_PROJECT_ID) throw new Error("NEON_PROJECT_ID is required");
if (!PR_NUMBER || !/^\d+$/.test(PR_NUMBER)) {
  throw new Error(`PR_NUMBER must be a plain integer, got: ${JSON.stringify(PR_NUMBER)}`);
}

const BRANCH_NAME = `pr-${PR_NUMBER}`;

// Hard guard: every destructive call in this file passes through here first.
// Refuses to operate on anything that isn't this PR's own branch name —
// in particular, this can never touch a production branch, because a
// production branch is never named pr-<number>.
function assertPrBranchName(name) {
  if (name !== BRANCH_NAME) {
    throw new Error(`Refusing to operate on branch "${name}" — this script only ever touches "${BRANCH_NAME}".`);
  }
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${NEON_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Neon API ${opts.method || "GET"} ${path} failed (${res.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

function sql(relPath) {
  return readFileSync(join(__dirname, relPath), "utf8");
}

function writeOutput(key, value) {
  const outPath = process.env.GITHUB_OUTPUT;
  if (!outPath) {
    console.log(`[no GITHUB_OUTPUT set] ${key}=<redacted>`);
    return;
  }
  // Values containing newlines need the heredoc form; connection URIs never
  // do, so the simple form is safe here.
  appendFileSync(outPath, `${key}=${value}\n`);
}

function maskInLogs(value) {
  // GitHub Actions log-masking directive — hides this exact string in all
  // subsequent step output for this job.
  console.log(`::add-mask::${value}`);
}

async function findExistingBranch(name) {
  const { branches } = await api(`/projects/${NEON_PROJECT_ID}/branches`);
  return branches.find((b) => b.name === name);
}

async function deleteBranch(branchId, name) {
  assertPrBranchName(name);
  console.log(`==> Deleting existing branch ${name} (${branchId})`);
  await api(`/projects/${NEON_PROJECT_ID}/branches/${branchId}`, { method: "DELETE" });
}

async function connectClient(uri) {
  const client = new Client({ connectionString: uri, ssl: { rejectUnauthorized: true } });
  await client.connect();
  return client;
}

async function runAsOwner(uri, sqlText) {
  const client = await connectClient(uri);
  try {
    await client.query(sqlText);
  } finally {
    await client.end();
  }
}

// New branches fork (copy-on-write) from the project's default branch, which
// used to be empty but now — since the backend build landed and production
// was bootstrapped with real schema — already carries the full schema, all
// roles, and real seed data at fork time. Re-running 0001_init.sql's raw
// CREATE TYPE/CREATE TABLE/CREATE POLICY statements against a branch that
// already has them fails hard (`type "user_role" already exists`, 42710).
// This checks which case we're in so the same script keeps working whether
// the parent branch is empty (fresh project) or already bootstrapped
// (current reality), without needing a second script to maintain.
async function schemaAlreadyPresent(uri) {
  const client = await connectClient(uri);
  try {
    const { rows } = await client.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') AS present`,
    );
    return rows[0].present === true;
  } finally {
    await client.end();
  }
}

async function main() {
  assertPrBranchName(BRANCH_NAME);

  const existing = await findExistingBranch(BRANCH_NAME);
  if (existing) {
    await deleteBranch(existing.id, existing.name);
  }

  console.log(`==> Creating branch: ${BRANCH_NAME}`);
  const branchResp = await api(`/projects/${NEON_PROJECT_ID}/branches`, {
    method: "POST",
    body: { branch: { name: BRANCH_NAME }, endpoints: [{ type: "read_write" }] },
  });
  const branchId = branchResp.branch.id;
  console.log(`==> Branch id: ${branchId}`);

  try {
    console.log("==> Waiting for endpoint...");
    await new Promise((r) => setTimeout(r, 6000));

    const uriResp = await api(
      `/projects/${NEON_PROJECT_ID}/connection_uri?branch_id=${branchId}&database_name=neondb&role_name=neondb_owner`,
    );
    const ownerUri = uriResp.uri;

    // roles.sql before 0001_init.sql — the migration's CREATE POLICY
    // statements grant to app_user, which must already exist. Same fix
    // AGENT_01 discovered the hard way in apply_ephemeral.mjs. This is safe
    // to run unconditionally either way: the CREATE ROLE is itself guarded
    // by an IF NOT EXISTS check, and every GRANT/ALTER statement in it is
    // idempotent.
    console.log("==> Applying roles.sql (owner role)");
    const appUserPw = crypto.randomBytes(24).toString("base64url");
    const rolesSql = sql("roles.sql").replace(/:'app_user_password'/g, `'${appUserPw.replace(/'/g, "''")}'`);
    await runAsOwner(ownerUri, rolesSql);

    // roles.sql only sets app_user's password on the CREATE ROLE branch, so
    // when app_user already existed (inherited from the fork), the freshly
    // generated password above was never actually applied. Set it
    // unconditionally here so every PR branch gets its own distinct
    // app_user credential regardless of which path roles.sql took —
    // isolated from production's app_user password and from any other PR's.
    console.log("==> Setting app_user password for this branch");
    await runAsOwner(ownerUri, `ALTER ROLE "app_user" WITH PASSWORD '${appUserPw.replace(/'/g, "''")}';`);

    if (await schemaAlreadyPresent(ownerUri)) {
      console.log("==> Schema already present (branch forked from a non-empty parent) — skipping 0001_init.sql");
    } else {
      console.log("==> Applying 0001_init.sql (owner role)");
      await runAsOwner(ownerUri, sql("../../apps/backend/drizzle/0001_init.sql"));
    }

    console.log("==> Seeding preview fixture (owner role)");
    // Reuses AGENT_01's two-tenant PENTEST_ISOLATION fixture — it doubles
    // as reasonable preview data so a human reviewer has something real to
    // click through (per PREVIEW ENVIRONMENTS: "a running application
    // against real branched data"). Safe to run even when the branch
    // already carries real production data (forked case) — its tenant/user
    // ids are fixed and distinct from anything production would generate
    // via gen_random_uuid(), and the ON CONFLICT guards make repeat runs
    // against the same already-seeded branch a no-op either way.
    await runAsOwner(ownerUri, sql("seed_isolation_test.sql"));

    const appUserUri = ownerUri.replace(/:\/\/[^:]+:[^@]+@/, `://app_user:${appUserPw}@`);
    maskInLogs(appUserUri);
    maskInLogs(ownerUri);

    writeOutput("branch_id", branchId);
    writeOutput("connection_uri", appUserUri);

    console.log(`\nBranch ${BRANCH_NAME} ready (id: ${branchId}).`);
  } catch (e) {
    console.error("==> PROVISION_PR_BRANCH failed:", e.message);
    console.log(`==> Tearing down partially-provisioned branch ${branchId}`);
    await deleteBranch(branchId, BRANCH_NAME).catch(() => {});
    throw e;
  }
}

await main();
