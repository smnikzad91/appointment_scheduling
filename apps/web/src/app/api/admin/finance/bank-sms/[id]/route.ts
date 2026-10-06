import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { payTopUp } from "@/lib/bankSms/topUps";

// The admin settles an SMS that wasn't matched automatically: { action: "match", topUpId } pays that
// top-up (also an expired one — the customer paid late) and credits the wallet once;
// { action: "ignore", note? } sets it aside.

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const sms = await prisma.bankSms.findUnique({ where: { id } });
  if (!sms) return NextResponse.json({ error: "پیامک پیدا نشد" }, { status: 404 });
  if (sms.status === "MATCHED") return NextResponse.json({ error: "این پیامک قبلاً با یک درخواست جور شده است" }, { status: 409 });

  if (body?.action === "ignore") {
    await prisma.bankSms.update({ where: { id }, data: { status: "IGNORED", note: typeof body.note === "string" ? body.note.slice(0, 300) : sms.note } });
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "match" && typeof body.topUpId === "string") {
    const topUp = await prisma.walletTopUp.findUnique({ where: { id: body.topUpId } });
    if (!topUp) return NextResponse.json({ error: "درخواست پیدا نشد" }, { status: 404 });
    if (sms.amountRial !== null && sms.amountRial !== topUp.payableRial) {
      return NextResponse.json({ error: "مبلغ پیامک با مبلغ درخواست یکی نیست" }, { status: 400 });
    }
    const paid = await payTopUp(topUp.id, { existingSmsId: sms.id }, true);
    if (!paid) return NextResponse.json({ error: "این درخواست قبلاً پرداخت یا لغو شده است" }, { status: 409 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
