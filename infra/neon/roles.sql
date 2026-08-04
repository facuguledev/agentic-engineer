-- infra/neon/roles.sql
-- Role setup applied once per Neon branch (ephemeral or, on promotion,
-- production) — before or alongside apps/backend/drizzle/0001_init.sql.
-- Not emitted by drizzle-kit: roles/grants are infra, not Drizzle schema
-- objects, per agents/agent-01-backend/system-prompt.md.
--
-- Run as the branch owner role. Never run as / grant to app_user.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD :'app_user_password';
  END IF;
END
$$;

-- Explicit, not just "absence of BYPASSRLS on create": makes the invariant
-- checkable with `SELECT rolbypassrls FROM pg_roles WHERE rolname='app_user'`.
ALTER ROLE app_user NOBYPASSRLS;

GRANT CONNECT ON DATABASE neondb TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

-- Table privileges only — app_user never gets DDL (no CREATE/ALTER/DROP).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO app_user;
