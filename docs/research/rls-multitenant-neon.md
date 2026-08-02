# Research: RLS multi-tenant isolation on Postgres/Neon

Basis for the rules in `agents/agent-01-backend/system-prompt.md`.

| # | Failure mode | Root cause | Fix |
|---|---|---|---|
| 1 | Context leak across pooled connections | Transaction-mode pooling shares connections across tenants; `current_user` is identical for all | `set_config('app.current_tenant_id', v, true)` — transaction-scoped, not session-scoped |
| 2 | RLS silently inactive | `ENABLE ROW LEVEL SECURITY` exempts the table owner (the migration role) by default | `FORCE ROW LEVEL SECURITY` on every table |
| 3 | Cross-tenant `INSERT` accepted | `USING` gates reads only; write path unguarded without `WITH CHECK` | Every policy defines both, same predicate |
| 4 | Policy fails at runtime | `current_setting()` returns `text`; no implicit cast to `uuid` | Explicit `::uuid` cast in the policy predicate |
| 5 | Cross-tenant existence disclosure | Global `UNIQUE(col)` constraint error reveals the value exists in another tenant | `UNIQUE(tenant_id, col)`, composite, never bare |
| 6 | RLS bypass in async paths | Background jobs / materialized views don't inherit session context | Same `set_config` call required before first query in any job transaction |
| 7 | Incomplete isolation despite correct app code | `AsyncLocalStorage` propagates `tenant_id` in-process; it does not set DB session state | Both layers required — ALS for app-layer propagation, `set_config(..., true)` for DB-layer enforcement |

## Sources

- [Postgres Row-Level Security Footguns — Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-footguns/)
- [Adopt Postgres RLS for Multi-Tenant Apps Without Slowing Your Team Down — Neon Guides](https://neon.com/guides/rls-multi-tenant-apps)
