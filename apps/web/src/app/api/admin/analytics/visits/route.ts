import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { VisitKind } from "@appointment-scheduling/database";

// The visit log of /admin/analytics: newest first, ?from&to&kind&path(contains)&page&pageSize.
const KINDS: VisitKind[] = ["VIEW", "BOOKING_OPEN", "BOOKING_DONE", "DOWNLOAD"];
const SIZES = [25, 50, 100, 200];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = req.nextUrl.searchParams;
  const to = new Date(p.get("to") ?? Date.now());
  const from = new Date(p.get("from") ?? to.getTime() - 30 * 86_400_000);
  const kind = p.get("kind") as VisitKind | null;
  const path = p.get("path")?.trim().slice(0, 100);
  const pageSize = SIZES.includes(Number(p.get("pageSize"))) ? Number(p.get("pageSize")) : 50;
  const page = Math.max(1, Math.min(10_000, Number(p.get("page")) || 1));
  const where = {
    createdAt: { gte: Number.isNaN(from.getTime()) ? undefined : from, lt: Number.isNaN(to.getTime()) ? undefined : to },
    ...(kind && KINDS.includes(kind) && { kind }),
    ...(path && { path: { contains: path } }),
  };
  const [items, total] = await Promise.all([
    prisma.pageVisit.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, kind: true, path: true, salonSlug: true, referrerType: true, referrerSource: true, browser: true, os: true, device: true, country: true, city: true, createdAt: true, visitorHash: true },
    }),
    prisma.pageVisit.count({ where }),
  ]);
  // a short visitor tag, enough to spot repeat visits in the log (never the hash itself)
  return NextResponse.json({ page, pageSize, total, items: items.map(({ visitorHash, ...v }) => ({ ...v, visitor: visitorHash.slice(0, 6) })) });
}
