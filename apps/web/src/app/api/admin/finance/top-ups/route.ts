import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { expireStale } from "@/lib/bankSms/topUps";

// The latest 200 wallet top-up requests for /admin/finance («درخواست‌های افزایش موجودی»).
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await expireStale();
  const rows = await prisma.walletTopUp.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { firstName: true, lastName: true, phone: true } }, adminCard: { select: { cardNumber: true } } },
  });
  return NextResponse.json(
    rows.map((t) => ({
      id: t.id,
      user: t.user,
      cardNumber: t.adminCard.cardNumber,
      amountToman: t.amountToman,
      payableRial: t.payableRial.toString(),
      status: t.status.toLowerCase(),
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      paidAt: t.paidAt,
      creditedToman: t.creditedToman,
    })),
  );
}
