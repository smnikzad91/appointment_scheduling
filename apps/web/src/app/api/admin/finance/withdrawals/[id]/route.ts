import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { closeWithdrawal } from "@/lib/withdrawals";

// PATCH {action:"paid", trackingCode} after transferring it, or {action:"reject", note} (money back).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  let ok: boolean;
  if (body?.action === "paid") {
    const trackingCode = String(body.trackingCode ?? "").trim().slice(0, 64);
    if (!trackingCode) return NextResponse.json({ error: "Enter the bank transfer's tracking code" }, { status: 400 });
    ok = await closeWithdrawal(id, "PAID", { trackingCode });
  } else if (body?.action === "reject") {
    ok = await closeWithdrawal(id, "REJECTED", { adminNote: String(body.note ?? "").trim().slice(0, 300) });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  if (!ok) return NextResponse.json({ error: "This request is no longer pending" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
