// apps/frontend/lib/db/pool.ts
//
// Two separate connections, on purpose:
//
// 1. `pool` (DATABASE_URL) — connects as `app_user` (see infra/neon/roles.sql:
//    NOBYPASSRLS, table-privilege-only grants). Every query through this pool
//    is subject to Row-Level Security. This is what every tenant-scoped API
//    route uses.
// 2. `identityPool` (DATABASE_OWNER_URL) — connects as the Neon owner role,
//    which bypasses RLS. Used ONLY by the login route, to resolve which
//    tenant/user an email belongs to *before* a tenant is known — RLS on
//    `users`/`tenants` is scoped by `app.current_tenant_id`, so there is no
//    way to do that lookup through the RLS-enforced pool without already
//    knowing the tenant, which is exactly what login needs to establish.
//    Never used for anything else — no other route should import this.
import { Pool, type PoolClient } from "pg";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. See docs/ci-cd-required-secrets.md — this must be configured as a Vercel Environment Variable.`
    );
  }
  return value;
}

let _pool: Pool | null = null;
let _identityPool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: requireEnv("DATABASE_URL"), ssl: { rejectUnauthorized: true } });
  }
  return _pool;
}

export function getIdentityPool(): Pool {
  if (!_identityPool) {
    _identityPool = new Pool({
      connectionString: requireEnv("DATABASE_OWNER_URL"),
      ssl: { rejectUnauthorized: true },
    });
  }
  return _identityPool;
}

/**
 * Runs `fn` inside a single transaction on the RLS-enforced pool, with
 * `app.current_tenant_id` set for the lifetime of that transaction via
 * `set_config(..., true)` (the parameterized equivalent of `SET LOCAL` —
 * plain `SET LOCAL "$1"` doesn't support bind parameters, and string-
 * interpolating tenantId into SQL would be an injection risk).
 *
 * tenantId must already be a verified value from the session (see
 * lib/auth/session.ts) — this function does not itself verify anything,
 * it only scopes the DB connection to whatever tenant it's given.
 */
export async function withTenant<T>(tenantId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
