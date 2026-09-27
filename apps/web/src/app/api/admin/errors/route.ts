import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ErrorSource as PrismaErrorSource, type Prisma } from "@appointment-scheduling/database";
import type { ErrorSource } from "@/types/content";

const PAGE_SIZE = 50;
const SOURCES: ErrorSource[] = ["api", "web_server", "web_client"];

async function requireAdmin() {
  const session = await auth();
  return session?.user?.id && session.user.role === "PLATFORM_ADMIN";
}

/** Shared filter for list/bulk-resolve: ?source=api|web_server|web_client, ?status=open|resolved. */
function buildWhere(params: URLSearchParams): Prisma.ErrorLogWhereInput {
  const where: Prisma.ErrorLogWhereInput = {};
  const source = params.get("source") as ErrorSource | null;
  if (source && SOURCES.includes(source)) where.source = source.toUpperCase() as PrismaErrorSource;
  const status = params.get("status");
  if (status === "open") where.resolved = false;
  if (status === "resolved") where.resolved = true;
  return where;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = req.nextUrl.searchParams;
  const where = buildWhere(params);
  const page = Math.max(1, Number(params.get("page")) || 1);
  const since24h = new Date(Date.now() - 24 * 60 * 60_000);

  const [items, total, openCount, last24h, openBySource] = await Promise.all([
    prisma.errorLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.errorLog.count({ where }),
    prisma.errorLog.count({ where: { resolved: false } }),
    prisma.errorLog.count({ where: { createdAt: { gte: since24h } } }),
    prisma.errorLog.groupBy({ by: ["source"], where: { resolved: false }, _count: { _all: true } }),
  ]);

  return NextResponse.json({
    items: items.map((e) => ({ ...e, source: e.source.toLowerCase() as ErrorSource })),
    total,
    page,
    pageSize: PAGE_SIZE,
    summary: {
      open: openCount,
      last24h,
      openBySource: Object.fromEntries(
        SOURCES.map((s) => [s, openBySource.find((g) => g.source === s.toUpperCase())?._count._all ?? 0]),
      ) as Record<ErrorSource, number>,
    },
  });
}

/** Bulk: { resolved: true } marks every open error matching the current ?source filter resolved. */
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { resolved } = await req.json();
  if (resolved !== true) return NextResponse.json({ error: "Only { resolved: true } is supported" }, { status: 400 });

  const where = { ...buildWhere(req.nextUrl.searchParams), resolved: false };
  const { count } = await prisma.errorLog.updateMany({ where, data: { resolved: true } });
  return NextResponse.json({ count });
}

/** Clears out resolved errors — open ones are never bulk-deleted. */
export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { count } = await prisma.errorLog.deleteMany({ where: { resolved: true } });
  return NextResponse.json({ count });
}
