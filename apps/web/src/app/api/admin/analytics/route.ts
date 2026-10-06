import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { analyticsSummary, parseWindow } from "@/lib/analytics/summary";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "PLATFORM_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { from, to } = parseWindow(req);
  return NextResponse.json(await analyticsSummary(from, to));
}
