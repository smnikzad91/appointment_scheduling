import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listAdminSalons } from "@/lib/api/adminSalons";
import { logError } from "@/lib/errorLog";

// Real platform numbers for the admin dashboard. Salons are owned by apps/api, so they're counted
// through its admin endpoint; users, tickets and bank SMS live in apps/web's own tables.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN" || !session.apiAccessToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [salons, users, customers, openTickets, unmatchedBankSms, pendingWithdrawals, negativeWallets] = await Promise.all([
    listAdminSalons(session.apiAccessToken).catch(async (error) => {
      await logError({ error, method: "GET", path: "/api/admin/overview", context: { step: "listAdminSalons" } });
      return null;
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.ticket.count({ where: { status: "OPEN" } }),
    prisma.bankSms.count({ where: { status: "UNMATCHED" } }),
    prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
    // owners whose completed booking was undone after they spent the money (paid off by later income)
    prisma.user.count({ where: { walletBalance: { lt: 0 } } }),
  ]);

  return NextResponse.json({
    salons: salons && {
      pending: salons.filter((s) => s.status === "PENDING").length,
      active: salons.filter((s) => s.status === "ACTIVE").length,
      suspended: salons.filter((s) => s.status === "SUSPENDED").length,
    },
    users,
    customers,
    openTickets,
    unmatchedBankSms,
    pendingWithdrawals,
    negativeWallets,
  });
}
