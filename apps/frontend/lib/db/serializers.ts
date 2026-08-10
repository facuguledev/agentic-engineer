// apps/frontend/lib/db/serializers.ts
// Row (snake_case, as Postgres returns it) -> API shape (camelCase, per
// contracts/api-specs/schema.ts) for each resource. Kept in one place so
// every route handler produces identically-shaped responses.

type TenantRow = { id: string; name: string; slug: string; created_at: Date };
type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: Date;
  updated_at: Date;
};
type ProjectRow = { id: string; name: string; created_by: string; created_at: Date; updated_at: Date };
type TaskRow = {
  id: string;
  project_id: string;
  assignee_id: string | null;
  title: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export function serializeTenant(row: TenantRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at.toISOString(),
  };
}

export function serializeUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function serializeProject(row: ProjectRow) {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function serializeTask(row: TaskRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    assigneeId: row.assignee_id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
