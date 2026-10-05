import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verify } from "@/lib/bankSms/signature";

// The bank-SMS device's heartbeat (every few minutes): signal, SIM/registration, queue size — shown
// on /admin/finance so a dead board or SIM is noticed.

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verify(process.env.BANK_SMS_DEVICE_SECRET ?? "", req.headers.get("x-bank-sms-timestamp"), raw, req.headers.get("x-bank-sms-signature"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let input: { deviceId?: unknown; signal?: unknown; info?: unknown };
  try {
    input = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof input.deviceId !== "string" || !input.deviceId) return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  const signal = typeof input.signal === "number" && Number.isFinite(input.signal) ? Math.round(input.signal) : null;
  const info = input.info && typeof input.info === "object" ? (input.info as object) : undefined;
  const id = input.deviceId.slice(0, 64);
  await prisma.bankSmsDevice.upsert({
    where: { id },
    create: { id, lastSeenAt: new Date(), signal, info },
    update: { lastSeenAt: new Date(), signal, info },
  });
  return NextResponse.json({ ok: true });
}
