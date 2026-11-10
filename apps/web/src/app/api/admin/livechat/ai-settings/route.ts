import { NextResponse } from "next/server";
import { sameOrigin } from "@/lib/livechat/config";
import { adminSession } from "@/lib/livechat/admin";
import { getLiveChatAiSettings, saveLiveChatAiSettings } from "@/lib/livechat/aiUsage";
import { aiConfigured } from "@/lib/livechat/aiClient";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

/** GET: the live chat AI settings (+ whether the AI service is configured in the environment). */
export async function GET() {
  if (!(await adminSession())) return forbidden();
  return NextResponse.json({ ...(await getLiveChatAiSettings()), configured: aiConfigured() }, { headers: { "cache-control": "no-store" } });
}

/** PUT {aiEnabled, handoverPhone, tomanPerUsd}: AI answers first or not, who gets the hand-over SMS, dollar rate for the cost view. */
export async function PUT(req: Request) {
  if (!sameOrigin(req) || !(await adminSession())) return forbidden();
  const body = (await req.json().catch(() => null)) as { aiEnabled?: unknown; handoverPhone?: unknown; tomanPerUsd?: unknown } | null;
  const phone = String(body?.handoverPhone ?? "")
    .replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .replace(/[\s-]/g, "")
    .replace(/^\+98/, "0");
  if (!/^09\d{9}$/.test(phone)) return NextResponse.json({ error: "phone" }, { status: 400 });
  const rate = body?.tomanPerUsd === null || body?.tomanPerUsd === "" || body?.tomanPerUsd === undefined ? null : Number(body.tomanPerUsd);
  if (rate !== null && (!Number.isInteger(rate) || rate < 1000 || rate > 100_000_000)) return NextResponse.json({ error: "rate" }, { status: 400 });
  await saveLiveChatAiSettings({ aiEnabled: body?.aiEnabled === true, handoverPhone: phone, tomanPerUsd: rate });
  return NextResponse.json({ ok: true });
}
