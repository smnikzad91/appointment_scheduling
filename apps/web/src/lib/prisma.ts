import { PrismaClient } from "@appointment-scheduling/database";

const globalForPrisma = global as typeof global & { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
