import { NextRequest, NextResponse } from "next/server";
import { verify } from "@/lib/bankSms/signature";
import { ingestSms } from "@/lib/bankSms/topUps";

// The bank-SMS device (apps/bank-sms-agent) forwards each received SMS here, signed with
// BANK_SMS_DEVICE_SECRET. Idempotent: a resend of the same SMS answers { duplicate: true }, so the
// device deletes it from the SIM only after a 200.

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.BANK_SMS_DEVICE_SECRET ?? "";
  if (!verify(secret, req.headers.get("x-bank-sms-timestamp"), raw, req.headers.get("x-bank-sms-signature"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let input: { deviceId?: unknown; sender?: unknown; body?: unknown; receivedAt?: unknown };
  try {
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const receivedAt = typeof input.receivedAt === "string" ? new Date(input.receivedAt) : null;
  if (typeof input.deviceId !== "string" || typeof input.sender !== "string" || typeof input.body !== "string" || !receivedAt || isNaN(receivedAt.getTime())) {
    return NextResponse.json({ error: "deviceId, sender, body and receivedAt are required" }, { status: 400 });
  }
  if (input.body.length > 2000 || input.sender.length > 64) return NextResponse.json({ error: "Too long" }, { status: 400 });
  const result = await ingestSms({ deviceId: input.deviceId.slice(0, 64), sender: input.sender, body: input.body, receivedAt });
  return NextResponse.json({ ok: true, ...result });
}
