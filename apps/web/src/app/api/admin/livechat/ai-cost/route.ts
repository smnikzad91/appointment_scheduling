import { NextResponse } from "next/server";
import { adminSession } from "@/lib/livechat/admin";
import { aiCostSummary } from "@/lib/livechat/aiUsage";

/** GET: «هزینه دستیار» — what the live chat's AI answers cost (today / 7 / 30 days / all, by model, costliest chats, latest answers). */
export async function GET() {
  if (!(await adminSession())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await aiCostSummary(), { headers: { "cache-control": "no-store" } });
}
