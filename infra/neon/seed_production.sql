-- infra/neon/seed_production.sql
-- One-time bootstrap fixture for the production branch: a single real
-- tenant and one admin user (the repo owner), so there is at least one
-- account to log in as once auth exists. Run as owner role, after
-- apps/backend/drizzle/0001_init.sql and infra/neon/roles.sql have applied.
--
-- Unlike seed_isolation_test.sql (two-tenant fixture for PENTEST_ISOLATION,
-- preview branches only), this never runs automatically — it's a manual,
-- one-time step for production, applied directly via the Neon SQL Editor
-- the first time the schema is bootstrapped.

INSERT INTO tenants (name, slug) VALUES ('Facundo', 'facundo');

INSERT INTO users (tenant_id, email, name, role)
SELECT id, 'facugule@gmail.com', 'Facundo', 'admin' FROM tenants WHERE slug = 'facundo';
