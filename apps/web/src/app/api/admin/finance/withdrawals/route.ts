import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withdrawalJson } from "@/lib/withdrawals";

// Withdrawal requests for /admin/finance («درخواست‌های برداشت»): every pending one (oldest first —
// they're the to-do list) followed by the latest 200 decided ones (newest first).
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = { select: { firstName: true, lastName: true, phone: true, role: true } } as const;
  const [pending, decided] = await Promise.all([
    prisma.withdrawalRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { user } }),
    prisma.withdrawalRequest.findMany({ where: { status: { not: "PENDING" } }, orderBy: { decidedAt: "desc" }, take: 200, include: { user } }),
  ]);
  const json = (w: (typeof pending)[number]) => ({
    ...withdrawalJson(w),
    user: { name: `${w.user.firstName} ${w.user.lastName}`.trim(), phone: w.user.phone, role: w.user.role.toLowerCase() },
  });
  return NextResponse.json({ items: [...pending, ...decided].map(json) });
}
