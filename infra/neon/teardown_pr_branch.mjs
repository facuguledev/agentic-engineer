#!/usr/bin/env node
// infra/neon/teardown_pr_branch.mjs
// AGENT_03 — companion to provision_pr_branch.mjs, run on PR close.
//
// Idempotent by design: if the branch doesn't exist (provisioning never
// ran, or already cleaned up), this is a no-op, not an error — PR-close
// events shouldn't fail a workflow just because there was nothing to do.
//
// Requires: NEON_API_KEY, NEON_PROJECT_ID, PR_NUMBER env vars.
// Usage: NEON_API_KEY=... NEON_PROJECT_ID=... PR_NUMBER=42 node teardown_pr_branch.mjs

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

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${NEON_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Neon API ${opts.method || "GET"} ${path} failed (${res.status}): ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function main() {
  const { branches } = await api(`/projects/${NEON_PROJECT_ID}/branches`);
  const existing = branches.find((b) => b.name === BRANCH_NAME);

  if (!existing) {
    console.log(`==> No branch named ${BRANCH_NAME} found — nothing to tear down.`);
    return;
  }

  // Same guard as provision_pr_branch.mjs: only ever deletes a branch whose
  // name is exactly this PR's own branch name.
  if (existing.name !== BRANCH_NAME) {
    throw new Error(`Refusing to delete branch "${existing.name}" — expected exactly "${BRANCH_NAME}".`);
  }

  console.log(`==> Deleting branch ${BRANCH_NAME} (${existing.id})`);
  await api(`/projects/${NEON_PROJECT_ID}/branches/${existing.id}`, { method: "DELETE" });
  console.log("==> Done.");
}

await main();
