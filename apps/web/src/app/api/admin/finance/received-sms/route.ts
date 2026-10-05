import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@appointment-scheduling/database";

// Every SMS the bank-SMS device forwarded (BankSms), newest first, 50 a page — for
// /admin/received-sms. ?status=matched|unmatched|not_deposit|ignored, ?sender=<exact>, ?q=<text in
// body or sender>, ?page=1. Also the senders seen so far with their counts, for the filter.

const PAGE_SIZE = 50;
const STATUSES = ["MATCHED", "UNMATCHED", "NOT_DEPOSIT", "IGNORED"] as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const p = req.nextUrl.searchParams;
  const status = p.get("status")?.toUpperCase();
  const sender = p.get("sender")?.trim();
  const q = p.get("q")?.trim().slice(0, 100);
  const page = Math.max(1, Math.min(10_000, Number(p.get("page")) || 1));

  const where: Prisma.BankSmsWhereInput = {
    ...(status && (STATUSES as readonly string[]).includes(status) && { status: status as (typeof STATUSES)[number] }),
    ...(sender && { sender }),
    ...(q && { OR: [{ body: { contains: q, mode: "insensitive" } }, { sender: { contains: q, mode: "insensitive" } }] }),
  };
  const [items, total, senders] = await Promise.all([
    prisma.bankSms.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { adminCard: { select: { cardNumber: true, bankName: true } }, topUp: { select: { user: { select: { firstName: true, lastName: true, phone: true } } } } },
    }),
    prisma.bankSms.count({ where }),
    prisma.bankSms.groupBy({ by: ["sender"], _count: { _all: true }, orderBy: { _count: { sender: "desc" } }, take: 100 }),
  ]);
  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    senders: senders.map((s) => ({ sender: s.sender, count: s._count._all })),
    items: items.map((s) => ({
      id: s.id,
      deviceId: s.deviceId,
      sender: s.sender,
      body: s.body,
      receivedAt: s.receivedAt,
      status: s.status.toLowerCase(),
      note: s.note,
      amountRial: s.amountRial?.toString() ?? null,
      card: s.adminCard,
      user: s.topUp?.user ?? null,
    })),
  });
}
