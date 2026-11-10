import { NextResponse } from "next/server";
import { adminSession, waitingSummary } from "@/lib/livechat/admin";

/** GET {n, last}: chats waiting for a reply + newest visitor message time (sidebar badge and chime). */
export async function GET() {
  if (!(await adminSession())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await waitingSummary(), { headers: { "cache-control": "no-store" } });
}
