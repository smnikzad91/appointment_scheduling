import { NextRequest, NextResponse } from "next/server";
import { applyPayment } from "@/lib/topUps";
import { verifyWebhook, type NodepassPayment } from "@/lib/nodepass";

// nodepass.ir → us when a top-up's payment is paid / expired / cancelled (lib/nodepass.ts). Signed over
// the raw body; a payment is credited once (conditional update), so nodepass's retries are harmless.
// 5xx → nodepass retries later.

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("x-nodepass-timestamp"), req.headers.get("x-nodepass-signature"))) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }
  let payment: NodepassPayment | undefined;
  try {
    payment = (JSON.parse(raw) as { payment?: NodepassPayment }).payment;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!payment?.id) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  await applyPayment(payment);
  return NextResponse.json({ ok: true });
}
