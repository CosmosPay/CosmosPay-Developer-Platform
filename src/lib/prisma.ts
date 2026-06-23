import { PrismaClient } from "@prisma/client";

// Singleton PrismaClient — guard against duplicate instances during HMR / dev reloads.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (import.meta.env.DEV) {
  globalForPrisma.prisma = prisma;
}
