// apps/backend/tests/migration-rls.test.ts
//
// Static assertions against apps/backend/drizzle/0001_init.sql as committed
// (checksummed and immutable per contracts/api-specs/migration-manifest.json
// — this file is never edited by these tests, only read). No live Postgres
// connection: this CI job (ci-checks) has no DATABASE_URL wired to it, so
// coverage is at the SQL-text level — RLS clause presence, composite
// FK/unique shape, and the tenants table's SELECT-only id-scoped policy —
// per agents/agent-01-backend/system-prompt.md §SCHEMA RULES.
//
// Live-DB behavioral coverage (does RLS actually block cross-tenant access
// at runtime) is exercised separately by infra/neon/run_pentest.mjs against
// an ephemeral branch, which is out of scope for this CI job by design.

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATION_PATH = join(__dirname, "../drizzle/0001_init.sql");

let sql: string;

beforeAll(() => {
  sql = readFileSync(MIGRATION_PATH, "utf8");
});

// Tenant-scoped tables: have a tenant_id column, RLS FOR ALL policy.
const TENANT_SCOPED_TABLES = ["users", "projects", "tasks"];
// tenants itself: no tenant_id column, scoped by id instead, SELECT only.
const ROOT_TABLE = "tenants";

// Extracts a table's full block from CREATE TABLE "<name>" up to (but not
// including) the next top-level "-- ====" section divider, so all indexes,
// RLS statements, and policies that follow the table definition — and
// belong to it — are captured together.
function tableBlock(sqlText: string, table: string): string {
  const start = sqlText.indexOf(`CREATE TABLE "${table}"`);
  expect(start, `CREATE TABLE "${table}" not found in migration`).toBeGreaterThan(-1);
  const nextDivider = sqlText.indexOf("-- ====", start + 1);
  return nextDivider === -1 ? sqlText.slice(start) : sqlText.slice(start, nextDivider);
}

const UUID_CAST_CLAUSE = `nullif(current_setting('app.current_tenant_id', true), '')::uuid`;

// Extracts the contents of a parenthesized clause following `keyword`
// (e.g. "USING" or "WITH CHECK"), correctly handling arbitrarily nested
// parens — these clauses nest two levels deep
// (USING( tenant_id = nullif( current_setting(...) , '')::uuid )), which a
// non-recursive regex like /\(([^)]*)\)/ cannot capture correctly (it stops
// at the first inner `)`), and even one level of manual regex nesting isn't
// enough here. A plain depth-counting scan handles any nesting depth.
function extractClause(text: string, keyword: string): string | null {
  const kwIndex = text.indexOf(keyword);
  if (kwIndex === -1) return null;
  const openIndex = text.indexOf("(", kwIndex);
  if (openIndex === -1) return null;
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) return text.slice(openIndex + 1, i);
    }
  }
  return null; // unbalanced — no matching close paren
}

describe("0001_init.sql — RLS policy presence per tenant-scoped table", () => {
  for (const table of TENANT_SCOPED_TABLES) {
    describe(`table: ${table}`, () => {
      let block: string;
      beforeAll(() => {
        block = tableBlock(sql, table);
      });

      it("has tenant_id NOT NULL column", () => {
        expect(block).toMatch(/"tenant_id"\s+uuid\s+NOT NULL/);
      });

      it("has ENABLE ROW LEVEL SECURITY", () => {
        expect(block).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      });

      it("has FORCE ROW LEVEL SECURITY (owner role would otherwise bypass RLS)", () => {
        expect(block).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
      });

      it("has a tenant_isolation policy scoped FOR ALL, TO app_user", () => {
        const policyMatch = block.match(
          new RegExp(`CREATE POLICY "tenant_isolation" ON "${table}"[\\s\\S]*?;`),
        );
        expect(policyMatch, `no tenant_isolation policy found for ${table}`).not.toBeNull();
        const policy = policyMatch![0];
        expect(policy).toMatch(/FOR ALL/);
        expect(policy).toMatch(/TO "app_user"/);
      });

      it("policy USING clause filters on tenant_id with the ::uuid cast", () => {
        const policyMatch = block.match(
          new RegExp(`CREATE POLICY "tenant_isolation" ON "${table}"[\\s\\S]*?;`),
        );
        const policy = policyMatch![0];
        const usingClause = extractClause(policy, "USING");
        expect(usingClause, `no USING clause found for ${table}`).not.toBeNull();
        expect(usingClause!).toContain("tenant_id =");
        expect(usingClause!).toContain(UUID_CAST_CLAUSE);
      });

      it("policy WITH CHECK clause filters on tenant_id with the ::uuid cast (blocks cross-tenant INSERT)", () => {
        const policyMatch = block.match(
          new RegExp(`CREATE POLICY "tenant_isolation" ON "${table}"[\\s\\S]*?;`),
        );
        const policy = policyMatch![0];
        const checkClause = extractClause(policy, "WITH CHECK");
        expect(checkClause, `no WITH CHECK clause found for ${table} — USING alone permits cross-tenant INSERT`).not.toBeNull();
        expect(checkClause!).toContain("tenant_id =");
        expect(checkClause!).toContain(UUID_CAST_CLAUSE);
      });
    });
  }
});

describe("0001_init.sql — tenants table (tenancy root, no tenant_id column)", () => {
  let block: string;
  beforeAll(() => {
    block = tableBlock(sql, ROOT_TABLE);
  });

  it("has no tenant_id column (it can't reference itself)", () => {
    expect(block).not.toMatch(/"tenant_id"/);
  });

  it("has ENABLE + FORCE ROW LEVEL SECURITY", () => {
    expect(block).toContain(`ALTER TABLE "${ROOT_TABLE}" ENABLE ROW LEVEL SECURITY;`);
    expect(block).toContain(`ALTER TABLE "${ROOT_TABLE}" FORCE ROW LEVEL SECURITY;`);
  });

  it("has a SELECT-only tenant_isolation policy (no app_user INSERT/UPDATE/DELETE path)", () => {
    const policyMatch = block.match(/CREATE POLICY "tenant_isolation" ON "tenants"[\s\S]*?;/);
    expect(policyMatch).not.toBeNull();
    const policy = policyMatch![0];
    expect(policy).toMatch(/FOR SELECT/);
    expect(policy).not.toMatch(/FOR ALL/);
    // No WITH CHECK is expected/required on a SELECT-only policy.
  });

  it("policy is scoped by id, not tenant_id — the tenancy-root case", () => {
    const policyMatch = block.match(/CREATE POLICY "tenant_isolation" ON "tenants"[\s\S]*?;/);
    const policy = policyMatch![0];
    const usingClause = extractClause(policy, "USING");
    expect(usingClause).not.toBeNull();
    expect(usingClause!).toContain("id =");
    expect(usingClause!).not.toContain("tenant_id =");
    expect(usingClause!).toContain(UUID_CAST_CLAUSE);
  });
});

describe("0001_init.sql — composite unique constraints (tenant_id, <col>), never bare UNIQUE(<col>)", () => {
  // Per §SCHEMA RULES: bare UNIQUE(<col>) leaks cross-tenant existence via
  // constraint-violation errors, so every UNIQUE INDEX on a tenant-scoped
  // table must include tenant_id as a leading column.
  it("every CREATE UNIQUE INDEX on a tenant-scoped table includes tenant_id", () => {
    const uniqueIndexes = [...sql.matchAll(/CREATE UNIQUE INDEX "([^"]+)" ON "([^"]+)" \(([^)]*)\);/g)];
    expect(uniqueIndexes.length).toBeGreaterThan(0);

    for (const match of uniqueIndexes) {
      const [, indexName, table, cols] = match;
      // Regex has exactly 3 capture groups and only matched entries reach
      // here, so these are always defined — but noUncheckedIndexedAccess
      // types match-array elements as possibly undefined, so guard anyway.
      if (!indexName || !table || cols === undefined) {
        throw new Error(`unexpected malformed match: ${JSON.stringify(match)}`);
      }
      if (!TENANT_SCOPED_TABLES.includes(table)) continue; // tenants itself is exempt — see below
      expect(cols, `unique index ${indexName} on tenant-scoped table ${table} must include tenant_id`).toContain(
        '"tenant_id"',
      );
    }
  });

  it("tenants.slug is the one legitimate bare-column unique index (tenants has no tenant_id)", () => {
    expect(sql).toContain(`CREATE UNIQUE INDEX "tenants_slug_unique" ON "tenants" ("slug");`);
  });

  it("users has a composite (tenant_id, id) unique index enabling composite FKs to it", () => {
    expect(sql).toContain(
      `CREATE UNIQUE INDEX "users_tenant_id_id_unique" ON "users" ("tenant_id", "id");`,
    );
  });

  it("projects has a composite (tenant_id, id) unique index enabling composite FKs to it", () => {
    expect(sql).toContain(
      `CREATE UNIQUE INDEX "projects_tenant_id_id_unique" ON "projects" ("tenant_id", "id");`,
    );
  });
});

describe("0001_init.sql — composite FK constraints (tenant-scoped referential integrity)", () => {
  // Each entry: [constraint name, table it's defined on, expected referenced table]
  const expectedCompositeFks: Array<{ name: string; table: string; references: string }> = [
    { name: "projects_tenant_id_created_by_fkey", table: "projects", references: "users" },
    { name: "tasks_tenant_id_project_id_fkey", table: "tasks", references: "projects" },
    { name: "tasks_tenant_id_assignee_id_fkey", table: "tasks", references: "users" },
  ];

  for (const { name, table, references } of expectedCompositeFks) {
    it(`${table} has composite FK "${name}" referencing (tenant_id, id) on ${references}`, () => {
      const fkRegex = new RegExp(
        `CONSTRAINT "${name}" FOREIGN KEY \\("tenant_id", "[a-z_]+"\\)\\s*REFERENCES "${references}" \\("tenant_id", "id"\\)`,
      );
      expect(sql, `composite FK ${name} not found with expected shape`).toMatch(fkRegex);
    });
  }

  it("every non-root table's tenant_id column itself has a plain (single-column) FK to tenants(id)", () => {
    for (const table of TENANT_SCOPED_TABLES) {
      const fkRegex = new RegExp(
        `CONSTRAINT "${table}_tenant_id_fkey" FOREIGN KEY \\("tenant_id"\\)\\s*REFERENCES "tenants" \\("id"\\)`,
      );
      expect(sql, `${table} is missing its single-column tenant_id -> tenants(id) FK`).toMatch(fkRegex);
    }
  });
});

describe("0001_init.sql — required columns per §SCHEMA RULES", () => {
  const ALL_TABLES = [ROOT_TABLE, ...TENANT_SCOPED_TABLES];

  for (const table of ALL_TABLES) {
    it(`${table} has id uuid PRIMARY KEY DEFAULT gen_random_uuid()`, () => {
      const block = tableBlock(sql, table);
      expect(block).toMatch(/"id"\s+uuid\s+PRIMARY KEY\s+DEFAULT gen_random_uuid\(\)/);
    });

    it(`${table} has created_at timestamptz NOT NULL DEFAULT now()`, () => {
      const block = tableBlock(sql, table);
      expect(block).toMatch(/"created_at"\s+timestamptz\s+NOT NULL\s+DEFAULT now\(\)/);
    });
  }

  // updated_at is required on mutable (non-root) tables; tenants is
  // effectively immutable from the app_user path (SELECT-only policy, no
  // app-level UPDATE), so it's not held to the same-updated_at requirement.
  for (const table of TENANT_SCOPED_TABLES) {
    it(`${table} has updated_at timestamptz NOT NULL DEFAULT now()`, () => {
      const block = tableBlock(sql, table);
      expect(block).toMatch(/"updated_at"\s+timestamptz\s+NOT NULL\s+DEFAULT now\(\)/);
    });
  }
});
