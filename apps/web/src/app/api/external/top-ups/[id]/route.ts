import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireStale, topUpJson } from "@/lib/bankSms/topUps";
import { authorized, serviceUserId } from "@/lib/externalTopUps";

// GET: a mychatbot.ir top-up's status (polled until paid/expired). DELETE: its customer cancelled.

async function find(id: string) {
  return prisma.walletTopUp.findFirst({ where: { id, userId: await serviceUserId() }, include: { adminCard: true } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await expireStale();
  const topUp = await find(id);
  if (!topUp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(topUpJson(topUp));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const topUp = await find(id);
  if (!topUp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.walletTopUp.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELLED" } });
  return NextResponse.json(topUpJson((await find(id))!));
}
