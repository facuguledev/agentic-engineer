-- 0001_init.sql
-- AGENT_01 — GENERATE_MIGRATION output. Immutable once applied: never edit
-- this file after APPLY_EPHEMERAL passes PENTEST_ISOLATION. Any later change
-- to this domain ships as 0002_*.sql or later.
--
-- Hand-authored (see src/db/schema.ts header for why) to be the exact SQL
-- `drizzle-kit generate` would produce for that schema file. Pending
-- verification: run `npx drizzle-kit generate` once npm install works in a
-- non-sandboxed environment and confirm zero diff against this file.

-- ============================================================================
-- Enums
-- ============================================================================
CREATE TYPE "user_role" AS ENUM ('admin', 'member');
CREATE TYPE "task_status" AS ENUM ('todo', 'doing', 'done');

-- ============================================================================
-- tenants
-- ============================================================================
CREATE TABLE "tenants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "tenants_slug_unique" ON "tenants" ("slug");

ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;

-- Root of tenancy: scoped by id, not tenant_id. SELECT only — tenant
-- creation/update is an owner-role operation outside the app_user path.
CREATE POLICY "tenant_isolation" ON "tenants"
  FOR SELECT
  TO "app_user"
  USING (id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

-- ============================================================================
-- users
-- ============================================================================
CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "role" "user_role" NOT NULL DEFAULT 'member',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id")
    REFERENCES "tenants" ("id") ON DELETE CASCADE
);

CREATE INDEX "users_tenant_id_idx" ON "users" ("tenant_id");
CREATE UNIQUE INDEX "users_tenant_id_id_unique" ON "users" ("tenant_id", "id");
CREATE UNIQUE INDEX "users_tenant_id_email_unique" ON "users" ("tenant_id", "email");

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "users"
  FOR ALL
  TO "app_user"
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

-- ============================================================================
-- projects
-- ============================================================================
CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "name" text NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "projects_tenant_id_fkey" FOREIGN KEY ("tenant_id")
    REFERENCES "tenants" ("id") ON DELETE CASCADE,
  -- created_by must belong to the SAME tenant as the project. A plain FK to
  -- users.id alone would allow a cross-tenant reference.
  CONSTRAINT "projects_tenant_id_created_by_fkey" FOREIGN KEY ("tenant_id", "created_by")
    REFERENCES "users" ("tenant_id", "id")
);

CREATE INDEX "projects_tenant_id_idx" ON "projects" ("tenant_id");
CREATE UNIQUE INDEX "projects_tenant_id_id_unique" ON "projects" ("tenant_id", "id");

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "projects"
  FOR ALL
  TO "app_user"
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);

-- ============================================================================
-- tasks
-- ============================================================================
CREATE TABLE "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "assignee_id" uuid,
  "title" text NOT NULL,
  "status" "task_status" NOT NULL DEFAULT 'todo',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id")
    REFERENCES "tenants" ("id") ON DELETE CASCADE,
  -- The PENTEST_ISOLATION case: project_id must resolve to a project in the
  -- SAME tenant_id as this row. Blocks cross-tenant task->project linking
  -- structurally, independent of RLS.
  CONSTRAINT "tasks_tenant_id_project_id_fkey" FOREIGN KEY ("tenant_id", "project_id")
    REFERENCES "projects" ("tenant_id", "id") ON DELETE CASCADE,
  -- Nullable composite FK: unchecked when assignee_id IS NULL (MATCH SIMPLE).
  CONSTRAINT "tasks_tenant_id_assignee_id_fkey" FOREIGN KEY ("tenant_id", "assignee_id")
    REFERENCES "users" ("tenant_id", "id") ON DELETE SET NULL
);

CREATE INDEX "tasks_tenant_id_idx" ON "tasks" ("tenant_id");

ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "tasks"
  FOR ALL
  TO "app_user"
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid);
