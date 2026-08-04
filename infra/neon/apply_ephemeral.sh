#!/usr/bin/env bash
# infra/neon/apply_ephemeral.sh
# AGENT_01 — APPLY_EPHEMERAL. Creates a throwaway Neon branch, applies
# 0001_init.sql + roles.sql + seed_isolation_test.sql, and prints connection
# strings for the owner role (migrations) and app_user (PENTEST_ISOLATION).
# Never applies to the branch named in NEON_PROD_BRANCH_ID / production.
#
# Requires: NEON_API_KEY, NEON_PROJECT_ID env vars. Uses the Neon REST API
# directly (curl) — no neonctl dependency, since installing global CLIs was
# unreliable in the execution sandbox this was authored in.
#
# Usage: NEON_API_KEY=... NEON_PROJECT_ID=... ./apply_ephemeral.sh

set -euo pipefail

: "${NEON_API_KEY:?NEON_API_KEY is required}"
: "${NEON_PROJECT_ID:?NEON_PROJECT_ID is required}"

API="https://console.neon.tech/api/v2"
AUTH=(-H "Authorization: Bearer ${NEON_API_KEY}" -H "Content-Type: application/json")
BRANCH_NAME="pentest-$(date +%s)"

echo "==> Creating ephemeral branch: ${BRANCH_NAME}"
BRANCH_JSON=$(curl -sf "${AUTH[@]}" -X POST \
  "${API}/projects/${NEON_PROJECT_ID}/branches" \
  -d "{\"branch\":{\"name\":\"${BRANCH_NAME}\"},\"endpoints\":[{\"type\":\"read_write\"}]}")

BRANCH_ID=$(echo "$BRANCH_JSON" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).branch.id')
echo "==> Branch id: ${BRANCH_ID}"

echo "==> Waiting for endpoint to come up..."
sleep 5

OWNER_URI=$(curl -sf "${AUTH[@]}" \
  "${API}/projects/${NEON_PROJECT_ID}/connection_uri?branch_id=${BRANCH_ID}&database_name=neondb&role_name=neondb_owner" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).uri')

# roles.sql MUST run before 0001_init.sql: the migration's
# `CREATE POLICY ... TO "app_user"` statements require the app_user role
# to already exist. (Bug found by actually executing this pipeline against
# a live branch — the order was wrong in the original hand-authored script.)
echo "==> Applying roles.sql (owner role)"
APP_USER_PW=$(node -e 'console.log(require("crypto").randomBytes(24).toString("base64url"))')
psql "$OWNER_URI" -v ON_ERROR_STOP=1 -v app_user_password="$APP_USER_PW" -f "$(dirname "$0")/roles.sql"

echo "==> Applying 0001_init.sql (owner role)"
psql "$OWNER_URI" -v ON_ERROR_STOP=1 -f "$(dirname "$0")/../../apps/backend/drizzle/0001_init.sql"

echo "==> Seeding isolation test fixture (owner role)"
psql "$OWNER_URI" -v ON_ERROR_STOP=1 -f "$(dirname "$0")/seed_isolation_test.sql"

APP_USER_URI=$(echo "$OWNER_URI" | sed -E "s#://[^:]+:[^@]+@#://app_user:${APP_USER_PW}@#")

echo "==> VALIDATE_SYNTAX: re-running 0001_init.sql must fail cleanly (already-applied guard)"
if psql "$OWNER_URI" -v ON_ERROR_STOP=1 -f "$(dirname "$0")/../../apps/backend/drizzle/0001_init.sql" 2>/dev/null; then
  echo "!! unexpected: migration re-applied without error — investigate before trusting this branch"
fi

echo
echo "Ephemeral branch ready: ${BRANCH_ID}"
echo "Owner URI (migrations only):"
echo "  ${OWNER_URI}"
echo "app_user URI (use this, and ONLY this, for PENTEST_ISOLATION):"
echo "  ${APP_USER_URI}"
echo
echo "Run: psql \"\$APP_USER_URI\" -f infra/neon/pentest_isolation.sql"
echo
echo "When done (pass or fail), delete the branch:"
echo "  curl -sf -H \"Authorization: Bearer \$NEON_API_KEY\" -X DELETE \"${API}/projects/${NEON_PROJECT_ID}/branches/${BRANCH_ID}\""
