import { PrismaClient } from "@appointment-scheduling/database";

const globalForPrisma = global as typeof global & { prisma?: PrismaClient };

// At most 5 connections per process unless DATABASE_URL says otherwise. Prisma's default
// (2 × CPUs + 1 = 9 here) × 2 cluster workers, doubled while a deploy's reload overlaps old and
// new workers, plus the build's own workers, went past salon_web's 40-connection limit on
// 2026-10-05 («too many connections for role "salon_web"»).
function pooledUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || /[?&]connection_limit=/.test(url)) return undefined;
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=5`;
}

// One client per process, in production too: Next can evaluate this module in several server
// bundles, and each `new PrismaClient()` opens its own pool.
export const prisma: PrismaClient =
  globalForPrisma.prisma ?? (globalForPrisma.prisma = new PrismaClient(pooledUrl() ? { datasourceUrl: pooledUrl() } : undefined));

/**
 * True only for Prisma's "record to update/delete not found" (P2025). Routes use this to return
 * 404 and rethrow everything else, so real failures reach instrumentation.ts and the error log
 * instead of being disguised as "not found".
 */
export function isPrismaNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2025";
}
