import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/mtaa_fix',
  },
  shadowDatabaseUrl:
    process.env.SHADOW_DATABASE_URL ??
    'postgresql://postgres:1224@localhost:5432/community_reporting_shadow?schema=public',
});
