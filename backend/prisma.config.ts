import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/mtaa_fix',
  },
  migrations: {
    path: 'prisma/migrations',
  },
});
