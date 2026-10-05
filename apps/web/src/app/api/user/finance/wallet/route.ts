import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestSession } from "@/lib/requestSession";

// The signed-in account's wallet: balance and its latest movements (WalletTransaction) — top-ups,
// booking pre-payments and their refunds, and for a salon owner the pre-payments they received.
export async function GET() {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [user, items] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { walletBalance: true } }),
    prisma.walletTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        appointment: { select: { startAt: true, salon: { select: { name: true, timezone: true } } } },
        payout: { select: { stylist: { select: { displayName: true } }, salon: { select: { name: true } } } },
        planPurchase: { select: { planName: true, months: true } },
      },
    }),
  ]);
  return NextResponse.json({
    balanceToman: user?.walletBalance ?? 0,
    items: items.map((t) => ({
      id: t.id,
      kind: t.kind.toLowerCase(),
      amountToman: t.amountToman,
      balanceAfter: t.balanceAfter,
      createdAt: t.createdAt,
      detail:
        t.kind === "PAYOUT_SENT" ? t.payout?.stylist.displayName ?? null
        : t.kind === "PAYOUT_RECEIVED" ? t.payout?.salon.name ?? null
        : t.planPurchase ? `${t.planPurchase.planName}، ${t.planPurchase.months.toLocaleString("fa-IR")} ماه`
        : null,
      appointment: t.appointment && { startAt: t.appointment.startAt, salonName: t.appointment.salon.name, timezone: t.appointment.salon.timezone },
    })),
  });
}
