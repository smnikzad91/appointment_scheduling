import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestSession } from "@/lib/requestSession";
import { parseWalletQuery, walletOrderBy, walletWhere } from "@/lib/walletQuery";
import type { Prisma } from "@appointment-scheduling/database";

// The signed-in account's wallet: balance and its movements (WalletTransaction) — top-ups,
// booking pre-payments and their refunds, and for a salon owner the pre-payments they received.
// Paged, filtered and sorted by the query string (lib/walletQuery.ts: direction, kind, period,
// sort, page, pageSize); with none it's the newest 50 (the Android app). Also returns the
// matching count, the money in / out over the matching rows, and the kinds this account has
// (for the type filter).
export async function GET(req: Request) {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const q = parseWalletQuery(new URL(req.url).searchParams);
  const where = { userId, ...walletWhere(q) } as Prisma.WalletTransactionWhereInput;
  const [user, items, total, sumIn, sumOut, kinds] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { walletBalance: true } }),
    prisma.walletTransaction.findMany({
      where,
      orderBy: walletOrderBy(q.sort),
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        appointment: { select: { startAt: true, salon: { select: { name: true, timezone: true } } } },
        payout: { select: { stylist: { select: { displayName: true } }, salon: { select: { name: true } } } },
        planPurchase: { select: { planName: true, months: true } },
      },
    }),
    prisma.walletTransaction.count({ where }),
    prisma.walletTransaction.aggregate({ where: { AND: [where, { amountToman: { gt: 0 } }] }, _sum: { amountToman: true } }),
    prisma.walletTransaction.aggregate({ where: { AND: [where, { amountToman: { lt: 0 } }] }, _sum: { amountToman: true } }),
    prisma.walletTransaction.groupBy({ by: ["kind"], where: { userId } }),
  ]);
  return NextResponse.json({
    balanceToman: user?.walletBalance ?? 0,
    total,
    page: q.page,
    pageSize: q.pageSize,
    inToman: sumIn._sum.amountToman ?? 0,
    outToman: -(sumOut._sum.amountToman ?? 0),
    kinds: kinds.map((k) => k.kind.toLowerCase()),
    items: items.map((t) => ({
      id: t.id,
      kind: t.kind.toLowerCase(),
      amountToman: t.amountToman,
      balanceAfter: t.balanceAfter,
      note: t.note,
      createdAt: t.createdAt,
      detail:
        t.kind === "PAYOUT_SENT" ? t.payout?.stylist.displayName ?? null
        : t.kind === "PAYOUT_RECEIVED" ? t.payout?.salon.name ?? null
        : t.planPurchase && t.kind === "PLAN_CREDIT" ? t.planPurchase.planName
        : t.planPurchase ? `${t.planPurchase.planName}، ${t.planPurchase.months.toLocaleString("fa-IR")} ماه`
        : null,
      appointment: t.appointment && { startAt: t.appointment.startAt, salonName: t.appointment.salon.name, timezone: t.appointment.salon.timezone },
    })),
  });
}
