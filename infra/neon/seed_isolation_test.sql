-- infra/neon/seed_isolation_test.sql
-- Two-tenant fixture for PENTEST_ISOLATION. Run as owner role, after
-- apps/backend/drizzle/0001_init.sql and infra/neon/roles.sql have applied.

INSERT INTO tenants (id, name, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tenant A', 'tenant-a'),
  ('22222222-2222-2222-2222-222222222222', 'Tenant B', 'tenant-b');

INSERT INTO users (id, tenant_id, email, name, role) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'alice@tenant-a.test', 'Alice', 'admin'),
  ('bbbbbbbb-0001-0001-0001-000000000001', '22222222-2222-2222-2222-222222222222', 'bob@tenant-b.test', 'Bob', 'admin');

INSERT INTO projects (id, tenant_id, name, created_by) VALUES
  ('aaaaaaaa-0002-0002-0002-000000000001', '11111111-1111-1111-1111-111111111111', 'A Roadmap', 'aaaaaaaa-0001-0001-0001-000000000001'),
  ('bbbbbbbb-0002-0002-0002-000000000001', '22222222-2222-2222-2222-222222222222', 'B Roadmap', 'bbbbbbbb-0001-0001-0001-000000000001');

INSERT INTO tasks (id, tenant_id, project_id, assignee_id, title, status) VALUES
  ('aaaaaaaa-0003-0003-0003-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0002-0002-0002-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001', 'A task', 'todo'),
  ('bbbbbbbb-0003-0003-0003-000000000001', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-0002-0002-0002-000000000001', 'bbbbbbbb-0001-0001-0001-000000000001', 'B task', 'todo');
