import { NextRequest, NextResponse } from "next/server";
import { recordVisit } from "@/lib/analytics/record";
import { isTrackedPath } from "@/lib/analytics/parse";

// Public beacon from lib/analytics/client.ts: {kind: "view" | "booking_open" | "booking_done", path,
// referrer?}. Only public pages are counted (isTrackedPath); always answers 204.
const KINDS = { view: "VIEW", booking_open: "BOOKING_OPEN", booking_done: "BOOKING_DONE" } as const;

export async function POST(req: NextRequest) {
  const text = await req.text().catch(() => "");
  if (text.length > 2000) return new NextResponse(null, { status: 204 });
  let body: { kind?: string; path?: string; referrer?: string } = {};
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const kind = KINDS[body.kind as keyof typeof KINDS];
  const path = typeof body.path === "string" ? body.path : "";
  if (kind && isTrackedPath(path)) {
    await recordVisit({ kind, path, referrer: typeof body.referrer === "string" ? body.referrer : null, headers: req.headers });
  }
  return new NextResponse(null, { status: 204 });
}
