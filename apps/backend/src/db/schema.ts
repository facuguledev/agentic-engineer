// AGENT_01 — GENERATE_MIGRATION
//
// Source of truth for schema + RLS policy. Drizzle `pgTable` only, per
// agents/agent-01-backend/system-prompt.md §SCHEMA RULES.
//
// NOTE ON PROVENANCE: this file was authored by hand, not emitted by
// `drizzle-kit generate`, because the execution sandbox for this run could
// not complete an `npm install` of drizzle-kit/drizzle-orm (proxied network,
// hard 44s per-command timeout, repeated corrupted installs). The
// corresponding migration (../drizzle/0001_init.sql) was hand-authored to
// match exactly what `drizzle-kit generate` would emit for this schema.
// TODO (unblocks once `npm install` succeeds in a working environment):
// run `npx drizzle-kit generate` against this file and diff the result
// against drizzle/0001_init.sql — it should produce no changes. If it does,
// the hand-written migration was wrong and must be corrected, not the tool.

import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Referenced by every tenant-scoped RLS policy below. `current_setting`
// returns text; the ::uuid cast is required (no implicit cast exists) and
// `nullif(..., '')` avoids a hard error when the session var is unset.
const tenantIdFilter = sql`tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid`;

export const userRole = pgEnum("user_role", ["admin", "member"]);
export const taskStatus = pgEnum("task_status", ["todo", "doing", "done"]);

// ---------------------------------------------------------------------------
// tenants — root of tenancy. Deliberately has NO tenant_id column (it can't
// reference itself). RLS still applies: a session may only ever see its own
// tenant row, scoped by id rather than tenant_id. There is no INSERT policy
// exposed to app_user — tenant creation is an owner-role / admin operation
// outside the request-scoped RLS path (see infra/neon/roles.sql).
// ---------------------------------------------------------------------------
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("tenants_slug_unique").on(t.slug),
    pgPolicy("tenant_isolation", {
      for: "select",
      to: "app_user",
      using: sql`id = nullif(current_setting('app.current_tenant_id', true), '')::uuid`,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: userRole("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("users_tenant_id_idx").on(t.tenantId),
    // Composite unique — required so tasks/projects can hold a composite FK
    // (tenant_id, user_id) back to this table, and so bare UNIQUE(email)
    // never leaks cross-tenant existence via a constraint-violation error.
    uniqueIndex("users_tenant_id_id_unique").on(t.tenantId, t.id),
    uniqueIndex("users_tenant_id_email_unique").on(t.tenantId, t.email),
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenants.id],
      name: "users_tenant_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("tenant_isolation", {
      for: "all",
      to: "app_user",
      using: tenantIdFilter,
      withCheck: tenantIdFilter,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    name: text("name").notNull(),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("projects_tenant_id_idx").on(t.tenantId),
    uniqueIndex("projects_tenant_id_id_unique").on(t.tenantId, t.id),
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenants.id],
      name: "projects_tenant_id_fkey",
    }).onDelete("cascade"),
    // Composite FK: created_by must belong to the SAME tenant as the
    // project. A plain FK to users.id alone would let a project reference a
    // user from a different tenant as long as the id exists anywhere.
    foreignKey({
      columns: [t.tenantId, t.createdBy],
      foreignColumns: [users.tenantId, users.id],
      name: "projects_tenant_id_created_by_fkey",
    }),
    pgPolicy("tenant_isolation", {
      for: "all",
      to: "app_user",
      using: tenantIdFilter,
      withCheck: tenantIdFilter,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// tasks
// ---------------------------------------------------------------------------
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    projectId: uuid("project_id").notNull(),
    assigneeId: uuid("assignee_id"),
    title: text("title").notNull(),
    status: taskStatus("status").notNull().default("todo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tasks_tenant_id_idx").on(t.tenantId),
    foreignKey({
      columns: [t.tenantId],
      foreignColumns: [tenants.id],
      name: "tasks_tenant_id_fkey",
    }).onDelete("cascade"),
    // Composite FK: the project a task belongs to must be in the task's own
    // tenant. This is the exact case PENTEST_ISOLATION exercises — without
    // this constraint, a row with a "correct" tenant_id could still point
    // project_id at another tenant's project via a plain FK to projects.id.
    foreignKey({
      columns: [t.tenantId, t.projectId],
      foreignColumns: [projects.tenantId, projects.id],
      name: "tasks_tenant_id_project_id_fkey",
    }).onDelete("cascade"),
    // Composite FK, nullable column: when assignee_id IS NULL the FK is not
    // checked (default MATCH SIMPLE) — correct, since assignee is optional.
    foreignKey({
      columns: [t.tenantId, t.assigneeId],
      foreignColumns: [users.tenantId, users.id],
      name: "tasks_tenant_id_assignee_id_fkey",
    }).onDelete("set null"),
    pgPolicy("tenant_isolation", {
      for: "all",
      to: "app_user",
      using: tenantIdFilter,
      withCheck: tenantIdFilter,
    }),
  ],
).enableRLS();
