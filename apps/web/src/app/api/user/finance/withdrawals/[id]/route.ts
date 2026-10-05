import { NextRequest, NextResponse } from "next/server";
import { requestSession } from "@/lib/requestSession";
import { closeWithdrawal } from "@/lib/withdrawals";

// Cancel your own pending withdrawal: the amount goes back to the wallet.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ok = await closeWithdrawal(id, "CANCELLED", { userId: session.user.id });
  if (!ok) return NextResponse.json({ error: "این درخواست دیگر در انتظار نیست" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
