import { NextRequest, NextResponse } from "next/server";
import { requestSession } from "@/lib/requestSession";
import { prisma } from "@/lib/prisma";

// The signed-in user's promotional-SMS choice (User.promoSmsOptOut): the "time to book again"
// texts. Transactional texts (codes, reminders, booking changes) aren't affected. The same switch
// is on the page behind the link in those texts (/r/<code>).

export async function GET() {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { promoSmsOptOut: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ promoSmsOptOut: user.promoSmsOptOut });
}

export async function PUT(req: NextRequest) {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { promoSmsOptOut?: unknown } | null;
  if (typeof body?.promoSmsOptOut !== "boolean") return NextResponse.json({ error: "promoSmsOptOut must be a boolean" }, { status: 400 });
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { promoSmsOptOut: body.promoSmsOptOut },
    select: { promoSmsOptOut: true },
  });
  return NextResponse.json(user);
}
