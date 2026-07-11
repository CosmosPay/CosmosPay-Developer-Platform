import { DATABASE_URL } from "astro:env/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

// Prisma 7: the connection no longer comes from the schema — the client is built on a
// driver adapter (@prisma/adapter-pg over `pg`) fed the DATABASE_URL from astro:env.
// Singleton — guard against duplicate instances during HMR / dev reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (import.meta.env.DEV) {
  globalForPrisma.prisma = prisma;
}
