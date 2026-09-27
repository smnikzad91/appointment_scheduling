import { PrismaClient } from "@appointment-scheduling/database";

const globalForPrisma = global as typeof global & { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * True only for Prisma's "record to update/delete not found" (P2025). Routes use this to return
 * 404 and rethrow everything else, so real failures reach instrumentation.ts and the error log
 * instead of being disguised as "not found".
 */
export function isPrismaNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2025";
}
