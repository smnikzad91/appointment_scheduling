import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/health — the web app is up and reaches Postgres (its own Prisma client). For the uptime
// monitor and load balancers; says nothing about the setup. 200 {status:"ok"} or 503.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3_000)),
    ]);
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
