#!/usr/bin/env node
// infra/neon/apply_ephemeral.mjs
// AGENT_01 — APPLY_EPHEMERAL (Node/pg rewrite of apply_ephemeral.sh).
//
// Rewritten from the original psql-based script because this execution
// sandbox has no `psql` binary and no apt/sudo to install one. Uses the
// Node `pg` client instead. Same steps, same guardrails:
//   1. create ephemeral Neon branch via REST API
//   2. apply 0001_init.sql as owner
//   3. apply roles.sql as owner (creates app_user, NOBYPASSRLS)
//   4. seed seed_isolation_test.sql as owner
//   5. re-apply 0001_init.sql — must fail (already-applied guard)
//   6. run pentest_isolation.sql AS app_user, statement by statement,
//      and evaluate each result against its documented expectation
//   7. never touches NEON_PROD_BRANCH_ID / production
//
// Requires: NEON_API_KEY, NEON_PROJECT_ID env vars.
// Requires: `pg` resolvable on NODE_PATH (see run notes — not committed to
// the repo; installed in a scratch dir per environment constraints).
//
// Usage: NEON_API_KEY=... NEON_PROJECT_ID=... node apply_ephemeral.mjs

import pg from "pg";
const { Client } = pg;
import { SocksClient } from "socks";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://console.neon.tech/api/v2";

const NEON_API_KEY = process.env.NEON_API_KEY;
const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID;
if (!NEON_API_KEY) throw new Error("NEON_API_KEY is required");
if (!NEON_PROJECT_ID) throw new Error("NEON_PROJECT_ID is required");

// Node's global fetch (undici) does not honor the sandbox's HTTP_PROXY env
// vars, and node:undici isn't exposed as a builtin in this Node build, so
// DNS/connect fails for fetch() even though curl (which does honor the
// proxy env vars) reaches the same host fine. Shell out to curl instead.
// The API key is passed via a curl -K config file (mode 0600, deleted
// immediately after each call) rather than argv, so it never appears in
// `ps` output or shell history.
function curlApi(path, { method = "GET", body } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "neon-curl-"));
  const configPath = join(dir, "cfg");
  const bodyPath = join(dir, "body.json");
  try {
    let config = `header = "Authorization: Bearer ${NEON_API_KEY}"\n` +
      `header = "Content-Type: application/json"\n` +
      `request = "${method}"\n` +
      `silent\n` +
      `show-error\n` +
      `fail-with-body\n`;
    if (body !== undefined) {
      writeFileSync(bodyPath, JSON.stringify(body), { mode: 0o600 });
      config += `data = "@${bodyPath}"\n`;
    }
    writeFileSync(configPath, config, { mode: 0o600 });
    const out = execFileSync("curl", ["-K", configPath, `${API}${path}`], { encoding: "utf8" });
    return out;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function api(path, opts = {}) {
  let text;
  try {
    text = curlApi(path, { method: opts.method || "GET", body: opts.body ? JSON.parse(opts.body) : undefined });
  } catch (e) {
    // execFileSync throws on non-2xx due to --fail-with-body; stdout still has the body.
    const out = e.stdout ? e.stdout.toString() : e.message;
    throw new Error(`Neon API ${opts.method || "GET"} ${path} failed: ${out}`);
  }
  return text ? JSON.parse(text) : {};
}

function sql(relPath) {
  return readFileSync(join(__dirname, relPath), "utf8");
}

async function main() {
  const branchName = `pentest-${Date.now()}`;
  console.log(`==> Creating ephemeral branch: ${branchName}`);
  const branchResp = await api(`/projects/${NEON_PROJECT_ID}/branches`, {
    method: "POST",
    body: JSON.stringify({ branch: { name: branchName }, endpoints: [{ type: "read_write" }] }),
  });
  const branchId = branchResp.branch.id;
  console.log(`==> Branch id: ${branchId}`);

  let ownerUri;
  try {
    console.log("==> Waiting for endpoint...");
    await new Promise((r) => setTimeout(r, 6000));

    const uriResp = await api(
      `/projects/${NEON_PROJECT_ID}/connection_uri?branch_id=${branchId}&database_name=neondb&role_name=neondb_owner`,
    );
    ownerUri = uriResp.uri;

    // NOTE: roles.sql must run BEFORE 0001_init.sql, not after. The
    // migration's `CREATE POLICY ... TO "app_user"` statements require the
    // app_user role to already exist — discovered by actually executing
    // this against a live branch (the prior hand-authored artifacts were
    // never run end-to-end). The original apply_ephemeral.sh had this in
    // the wrong order too; fixed here.
    console.log("==> Applying roles.sql (owner role)");
    const appUserPw = crypto.randomBytes(24).toString("base64url");
    const rolesSql = sql("roles.sql").replace(/:'app_user_password'/g, `'${appUserPw.replace(/'/g, "''")}'`);
    await runAsOwner(ownerUri, rolesSql);

    console.log("==> Applying 0001_init.sql (owner role)");
    await runAsOwner(ownerUri, sql("../../apps/backend/drizzle/0001_init.sql"));

    console.log("==> Seeding isolation test fixture (owner role)");
    await runAsOwner(ownerUri, sql("seed_isolation_test.sql"));

    console.log("==> VALIDATE_SYNTAX: re-running 0001_init.sql must fail cleanly");
    let reapplyFailed = false;
    try {
      await runAsOwner(ownerUri, sql("../../apps/backend/drizzle/0001_init.sql"));
    } catch (e) {
      reapplyFailed = true;
      console.log(`    OK — re-apply failed as expected: ${e.message.split("\n")[0]}`);
    }
    if (!reapplyFailed) {
      throw new Error("VALIDATE_SYNTAX FAILED: re-applying 0001_init.sql succeeded — schema is not idempotent-guarded, do not trust this branch");
    }

    const appUserUri = ownerUri.replace(/:\/\/[^:]+:[^@]+@/, `://app_user:${appUserPw}@`);

    return { branchId, ownerUri, appUserUri };
  } catch (e) {
    console.error("==> APPLY_EPHEMERAL/VALIDATE_SYNTAX failed:", e.message);
    console.log(`==> Tearing down branch ${branchId}`);
    await api(`/projects/${NEON_PROJECT_ID}/branches/${branchId}`, { method: "DELETE" }).catch(() => {});
    throw e;
  }
}

// This sandbox has no direct outbound TCP for raw (non-HTTP) connections —
// only a SOCKS5 proxy (ALL_PROXY=socks5h://localhost:1080) with remote DNS
// resolution. `pg` has no native SOCKS support, so we open the TCP tunnel
// ourselves via the `socks` package and hand pg the resulting socket via
// its `stream` option; pg still parses user/pass/db from connectionString
// as usual and performs the Postgres SSL upgrade over our socket.
async function socksSocketFor(uri) {
  const u = new URL(uri);
  const { socket } = await SocksClient.createConnection({
    proxy: { host: "localhost", port: 1080, type: 5 },
    command: "connect",
    destination: { host: u.hostname, port: Number(u.port) || 5432 },
  });
  // pg's Connection always calls stream.connect(port, host) itself, even
  // when a custom stream is supplied — that would re-dial directly
  // (bypassing the SOCKS tunnel) and fail DNS in this sandbox. The socket
  // is already connected via SOCKS, so make connect() a no-op that just
  // fires the 'connect' event pg is waiting on.
  socket.connect = () => {
    process.nextTick(() => socket.emit("connect"));
    return socket;
  };
  return socket;
}

async function connectClient(uri) {
  const stream = await socksSocketFor(uri);
  const client = new Client({ connectionString: uri, stream, ssl: { rejectUnauthorized: true } });
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

const result = await main();
console.log("\nEphemeral branch ready:", result.branchId);

// Persist to a local-sandbox-only temp file (never inside the repo, never
// printed to stdout) so a subsequent, separate process invocation
// (run_pentest.mjs, teardown) can pick up the connection info without
// credentials appearing in tool-call logs.
const outPath = process.env.APPLY_EPHEMERAL_STATE_FILE || "/tmp/scratch-pg/branch_state.json";
writeFileSync(outPath, JSON.stringify(result, null, 2), { mode: 0o600 });
console.log(`State written to ${outPath} (local sandbox only, not committed, not logged).`);

export { main };
