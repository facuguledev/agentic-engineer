#!/usr/bin/env node
// infra/neon/apply_production.mjs
// AGENT_03 — APPLY_PRODUCTION_MIGRATION (deploy-production.yml's deploy-migration job).
//
// Deliberately narrower than provision_pr_branch.mjs / apply_ephemeral.mjs:
// this script has NO branch-lifecycle capability whatsoever — it never
// calls the Neon branch create or delete endpoints. It only fetches a
// connection URI for a branch that must already exist (NEON_PROD_BRANCH_ID)
// and runs SQL against it. That's a structural guarantee, not just a
// runtime check: there is no code path in this file that can create or
// delete a branch, so it cannot do to production what
// provision_pr_branch.mjs does to preview branches.
//
// Safety properties, each enforced in code below, not just by convention:
//   1. NEON_PROD_BRANCH_ID must be explicitly provided — never looked up
//      by name/label, never defaulted, never inferred. A typo'd or unset
//      env var fails loudly rather than silently resolving to some other
//      branch.
//   2. The migration file's checksum is re-verified against
//      contracts/api-specs/migration-manifest.json here, independently of
//      deploy-production.yml's own validate-migration-integrity job —
//      defense in depth, in case this script is ever invoked outside that
//      workflow.
//   3. Idempotent and safe to re-run: a local `_migrations_applied`
//      tracking table (created if missing) records which migration
//      (by filename) has already been applied, with its checksum. If the
//      current migration is already recorded with a matching checksum,
//      this is a no-op success. If it's recorded with a DIFFERENT
//      checksum, that means the migration file changed after being
//      applied to production — a hard, unrecoverable-by-this-script error,
//      never silently reapplied.
//   4. Migration SQL + the tracking-table insert run in a single
//      transaction. Postgres DDL is transactional, so a failure partway
//      through the migration rolls back cleanly — nothing is left
//      half-applied or falsely marked as applied.
//   5. Never DROP, never TRUNCATE, never resets anything — this script's
//      only write operations are: create the tracking table if it doesn't
//      exist, run the migration file's SQL verbatim, insert one tracking
//      row. It does not and cannot alter what's inside the migration file.
//
// Requires: NEON_API_KEY, NEON_PROJECT_ID, NEON_PROD_BRANCH_ID env vars.
// Usage: NEON_API_KEY=... NEON_PROJECT_ID=... NEON_PROD_BRANCH_ID=... node apply_production.mjs

import pg from "pg";
const { Client } = pg;
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://console.neon.tech/api/v2";

const NEON_API_KEY = process.env.NEON_API_KEY;
const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID;
const NEON_PROD_BRANCH_ID = process.env.NEON_PROD_BRANCH_ID;

if (!NEON_API_KEY) throw new Error("NEON_API_KEY is required");
if (!NEON_PROJECT_ID) throw new Error("NEON_PROJECT_ID is required");
if (!NEON_PROD_BRANCH_ID) {
  throw new Error(
    "NEON_PROD_BRANCH_ID is required — this script refuses to guess or look up the production branch by name. Set it explicitly.",
  );
}

async function api(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${NEON_API_KEY}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Neon API GET ${path} failed (${res.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

function loadManifest() {
  const manifestPath = join(__dirname, "..", "..", "contracts", "api-specs", "migration-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.checksumAlgorithm !== "sha256") {
    throw new Error(`Unsupported checksum algorithm "${manifest.checksumAlgorithm}" in manifest. Aborting.`);
  }
  return manifest;
}

function verifyChecksum(manifest) {
  const migrationPath = join(__dirname, "..", "..", manifest.migrationPath);
  const contents = readFileSync(migrationPath, "utf8");
  const actual = crypto.createHash("sha256").update(contents).digest("hex");
  if (actual !== manifest.checksum) {
    throw new Error(
      `Checksum mismatch on ${manifest.migrationPath}. Expected ${manifest.checksum}, got ${actual}. ` +
        `The migration file was modified after the manifest was emitted — this is a hard block, not a warning. Aborting.`,
    );
  }
  return { migrationPath, migrationName: basename(manifest.migrationPath), sql: contents };
}

async function connectToProdBranch() {
  const uriResp = await api(
    `/projects/${NEON_PROJECT_ID}/connection_uri?branch_id=${NEON_PROD_BRANCH_ID}&database_name=neondb&role_name=neondb_owner`,
  );
  const client = new Client({ connectionString: uriResp.uri, ssl: { rejectUnauthorized: true } });
  await client.connect();
  return client;
}

async function main() {
  const manifest = loadManifest();
  const { migrationName, sql } = verifyChecksum(manifest);
  console.log(`==> Checksum verified for ${migrationName}.`);

  const client = await connectToProdBranch();
  try {
    console.log(`==> Connected to production branch ${NEON_PROD_BRANCH_ID}.`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations_applied (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const { rows } = await client.query(
      "SELECT checksum FROM _migrations_applied WHERE name = $1",
      [migrationName],
    );

    if (rows.length > 0) {
      if (rows[0].checksum === manifest.checksum) {
        console.log(`==> ${migrationName} already applied with matching checksum. No-op, exiting successfully.`);
        return;
      }
      throw new Error(
        `${migrationName} is recorded as already applied to production with a DIFFERENT checksum ` +
          `(recorded: ${rows[0].checksum}, current: ${manifest.checksum}). This means the migration file ` +
          `changed after it was applied — refusing to reapply. This requires human investigation, not an ` +
          `automatic retry.`,
      );
    }

    console.log(`==> Applying ${migrationName} (transactional)...`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO _migrations_applied (name, checksum) VALUES ($1, $2)",
        [migrationName, manifest.checksum],
      );
      await client.query("COMMIT");
      console.log(`==> ${migrationName} applied and recorded.`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  } finally {
    await client.end();
  }
}

await main();
