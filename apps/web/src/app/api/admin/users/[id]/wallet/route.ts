import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { moveWallet } from "@/lib/wallet";
import { randomUUID } from "node:crypto";
import { adjustmentSmsText, parseAdjustment } from "@/lib/walletAdjustment";
import { sendPlatformSms } from "@/lib/notifycloud";

// Platform admin adds to or takes from a user's wallet by hand — e.g. a card payment the bank SMS
// couldn't match (paid without the top-up's rial offset). One ADMIN_ADJUSTMENT WalletTransaction
// whose note (the reason) the user sees in their wallet history. A debit never takes the balance
// below zero (409). Unless `notify: false`, the user gets an SMS with the amount and new balance
// (the platform's SMS, after the change is saved, fire-and-forget like the other web alerts).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const input = parseAdjustment(await req.json().catch(() => null));
  if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id }, select: { deletedAt: true, phone: true } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.deletedAt) return NextResponse.json({ error: "This account is closed" }, { status: 400 });

  const balance = await prisma.$transaction((tx) => moveWallet(tx, id, input.amountToman, "ADMIN_ADJUSTMENT", { note: input.note }));
  if (balance === null) return NextResponse.json({ error: "Not enough wallet balance" }, { status: 409 });
  const sms = input.notify && !!user.phone && !!process.env.SMS_API_KEY;
  if (sms) void sendPlatformSms(user.phone!, adjustmentSmsText(input.amountToman, balance), `wallet-adjust-${randomUUID()}`, "wallet adjustment sms");
  return NextResponse.json({ walletBalance: balance, sms });
}
