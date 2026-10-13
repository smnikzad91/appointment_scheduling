import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchExternalSms, topUpJson } from "@/lib/bankSms/topUps";
import { authorized, serviceUserId } from "@/lib/externalTopUps";

// POST {smsId}: mychatbot.ir's admin decided this UNMATCHED deposit SMS pays this top-up of theirs (the
// top-up may be expired or cancelled; the credit is what the SMS says was paid). 409 {error}: "sms_taken" /
// "top_up_taken" if either is used, "sms_mismatch" if the SMS came to another card or before the top-up.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (typeof body?.smsId !== "string") return NextResponse.json({ error: "smsId required" }, { status: 400 });
  const owned = await prisma.walletTopUp.findFirst({ where: { id, userId: await serviceUserId() }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const result = await matchExternalSms(id, body.smsId);
  if (result !== "ok") return NextResponse.json({ error: result }, { status: 409 });
  const topUp = await prisma.walletTopUp.findUniqueOrThrow({ where: { id }, include: { adminCard: true } });
  return NextResponse.json(topUpJson(topUp));
}
