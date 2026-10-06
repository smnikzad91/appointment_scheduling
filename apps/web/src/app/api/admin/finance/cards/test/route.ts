import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { compileTemplate, parseSms } from "@/lib/bankSms/template";

// Try a deposit SMS template against a real SMS before saving it: { template, sms } → the values.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const template = typeof body?.template === "string" ? body.template : "";
  const sms = typeof body?.sms === "string" ? body.sms : "";
  try {
    const parsed = parseSms(compileTemplate(template), sms);
    if (!parsed) return NextResponse.json({ ok: false, error: "این پیامک با قالب جور نیست" });
    return NextResponse.json({
      ok: true,
      amountRial: parsed.amountRial.toString(),
      balanceRial: parsed.balanceRial?.toString() ?? null,
      card: parsed.card,
      date: parsed.date,
      time: parsed.time,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message });
  }
}
