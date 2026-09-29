import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service.js";

const DB_TIMEOUT_MS = 3_000;

/**
 * GET /health — for the uptime monitor (scripts/uptime-monitor.cjs) and anyone else checking the
 * API: 200 {status:"ok"} when a trivial query reaches Postgres within DB_TIMEOUT_MS, else 503.
 * Nothing about the setup (hosts, versions, errors) is in the response.
 */
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => (timer = setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS))),
      ]);
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    } finally {
      clearTimeout(timer);
    }
    return { status: "ok" };
  }
}
