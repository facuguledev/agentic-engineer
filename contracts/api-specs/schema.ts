// contracts/api-specs/schema.ts
// AGENT_01 — EMIT_CONTRACT output for AGENT_02 (frontend).
//
// Generated from apps/backend/src/db/schema.ts / drizzle/0001_init.sql after
// PENTEST_ISOLATION passed 8/8 vectors on ephemeral Neon branch
// br-odd-mud-axwhqo1t (torn down after this run; not a live reference).
//
// These are API-boundary shapes, not raw DB rows: no tenant_id on read
// responses (tenant scoping is implicit/server-enforced via RLS + verified
// auth token, never client-supplied) and no tenant_id accepted on writes
// for the same reason — see agents/agent-01-backend/system-prompt.md
// §TENANT ISOLATION. AGENT_02 should never construct or transmit tenant_id.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const UserRole = z.enum(["admin", "member"]);
export type UserRole = z.infer<typeof UserRole>;

export const TaskStatus = z.enum(["todo", "doing", "done"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

// ---------------------------------------------------------------------------
// tenants — read-only from the API surface. Creation/update is an
// owner-role/admin operation outside the request-scoped RLS path; AGENT_02
// only ever reads the caller's own tenant (server resolves it from the
// auth token, exactly one row, scoped by id not tenant_id).
// ---------------------------------------------------------------------------
export const TenantResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string().datetime(),
});
export type TenantResponse = z.infer<typeof TenantResponse>;

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const UserResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: UserRole,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserResponse = z.infer<typeof UserResponse>;

export const CreateUserRequest = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: UserRole.default("member"),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequest>;

export const UpdateUserRequest = z.object({
  name: z.string().min(1).optional(),
  role: UserRole.optional(),
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequest>;

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------
export const ProjectResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ProjectResponse = z.infer<typeof ProjectResponse>;

export const CreateProjectRequest = z.object({
  name: z.string().min(1),
  // createdBy is NOT accepted from the client — server derives it from the
  // authenticated session. Field omitted from the request schema on purpose.
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequest>;

export const UpdateProjectRequest = z.object({
  name: z.string().min(1).optional(),
});
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequest>;

// ---------------------------------------------------------------------------
// tasks
// ---------------------------------------------------------------------------
export const TaskResponse = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable(),
  title: z.string(),
  status: TaskStatus,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaskResponse = z.infer<typeof TaskResponse>;

export const CreateTaskRequest = z.object({
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  status: TaskStatus.default("todo"),
});
export type CreateTaskRequest = z.infer<typeof CreateTaskRequest>;

export const UpdateTaskRequest = z.object({
  assigneeId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).optional(),
  status: TaskStatus.optional(),
});
export type UpdateTaskRequest = z.infer<typeof UpdateTaskRequest>;

// ---------------------------------------------------------------------------
// Generic error envelope — matches §API LAYER: global error middleware
// returns a generic shape, no stack traces or schema details, on every
// non-2xx response.
// ---------------------------------------------------------------------------
export const ErrorResponse = z.object({
  error: z.string(),
  requestId: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
