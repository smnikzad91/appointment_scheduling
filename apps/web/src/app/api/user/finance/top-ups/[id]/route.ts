import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestSession } from "@/lib/requestSession";
import { expireStale, topUpJson } from "@/lib/bankSms/topUps";

// One top-up (polled while the customer waits for the bank SMS) / cancel it while pending.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await expireStale();
  const topUp = await prisma.walletTopUp.findFirst({ where: { id, userId: session.user.id }, include: { adminCard: true } });
  if (!topUp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(topUpJson(topUp));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { count } = await prisma.walletTopUp.updateMany({ where: { id, userId: session.user.id, status: "PENDING" }, data: { status: "CANCELLED" } });
  if (count === 0) return NextResponse.json({ error: "این درخواست دیگر قابل لغو نیست" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
