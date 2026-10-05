import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkSmsSettings } from "@/lib/bankSms/cards";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // a card with top-ups stays (their history points at it)
  if (await prisma.walletTopUp.count({ where: { adminCardId: id } })) {
    return NextResponse.json({ error: "این کارت در افزایش موجودی‌ها استفاده شده و قابل حذف نیست؛ قالب پیامکش را خالی کنید تا دیگر استفاده نشود" }, { status: 409 });
  }
  const { count } = await prisma.adminCard.deleteMany({ where: { id } });
  if (count === 0) return NextResponse.json({ error: "Card not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}

/** Set or clear the card's deposit SMS (sender + template): { smsSender, smsTemplate } — empty clears both. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const smsSender = typeof body.smsSender === "string" ? body.smsSender.trim() || null : null;
  const smsTemplate = typeof body.smsTemplate === "string" ? body.smsTemplate.trim() || null : null;
  const problem = checkSmsSettings(smsSender, smsTemplate);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const { count } = await prisma.adminCard.updateMany({ where: { id }, data: { smsSender, smsTemplate } });
  if (count === 0) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
