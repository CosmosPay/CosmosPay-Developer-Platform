import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer accepts `url` inside schema.prisma's datasource — the connection
// string lives here (used by the CLI: migrate/db). At runtime the PrismaClient gets its
// connection from the @prisma/adapter-pg driver adapter instead (see src/lib/prisma.ts).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
