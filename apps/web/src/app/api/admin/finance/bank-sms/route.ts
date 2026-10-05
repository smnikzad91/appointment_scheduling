import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { expireStale } from "@/lib/bankSms/topUps";

// The bank-SMS log for the admin: recent SMS (matched, unmatched, other), recent top-ups and the
// device's last heartbeat.

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await expireStale();
  const [sms, topUps, devices] = await Promise.all([
    prisma.bankSms.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { adminCard: { select: { cardNumber: true, bankName: true } }, topUp: { select: { id: true, user: { select: { firstName: true, lastName: true, phone: true } } } } } }),
    prisma.walletTopUp.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { user: { select: { firstName: true, lastName: true, phone: true } }, adminCard: { select: { cardNumber: true } } } }),
    prisma.bankSmsDevice.findMany({ orderBy: { lastSeenAt: "desc" } }),
  ]);
  return NextResponse.json({
    sms: sms.map((s) => ({
      id: s.id,
      sender: s.sender,
      body: s.body,
      receivedAt: s.receivedAt,
      status: s.status.toLowerCase(),
      note: s.note,
      amountRial: s.amountRial?.toString() ?? null,
      balanceRial: s.balanceRial?.toString() ?? null,
      card: s.adminCard,
      topUp: s.topUp ? { id: s.topUp.id, user: s.topUp.user } : null,
    })),
    topUps: topUps.map((t) => ({
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
    devices: devices.map((d) => ({ id: d.id, lastSeenAt: d.lastSeenAt, signal: d.signal, info: d.info })),
  });
}
