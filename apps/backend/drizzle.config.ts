import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Owner/migration credentials only — never the runtime app_user.
  // Supplied at generate/migrate time via env, never committed.
  dbCredentials: {
    url: process.env.DATABASE_URL_OWNER ?? "",
  },
} satisfies Config;
