import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isValidIranianMobile, normalizeIranianMobile } from "@/lib/persian";
import { FEEDBACK_KINDS, FEEDBACK_MESSAGE_MAX, FEEDBACK_MESSAGE_MIN, FEEDBACK_ROLES, type FeedbackKind, type FeedbackRole } from "@/lib/feedback";

// The public «نظرات و پیشنهادات» form (/feedback). Anyone may send; a signed-in sender's id is kept.
// Each IP gets 5 messages per 10 minutes (per instance, in memory), and a filled honeypot field
// (`website`, hidden from people) is silently accepted and dropped.

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
const recentByIp = new Map<string, { windowStart: number; count: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = recentByIp.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    if (recentByIp.size > 5_000) recentByIp.clear();
    recentByIp.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true }, { status: 201 });

  const kind = FEEDBACK_KINDS.includes(body.kind) ? (body.kind as FeedbackKind) : null;
  if (!kind) return NextResponse.json({ error: "نوع پیام را انتخاب کنید" }, { status: 400 });
  const role = FEEDBACK_ROLES.includes(body.role) ? (body.role as FeedbackRole) : null;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < FEEDBACK_MESSAGE_MIN) return NextResponse.json({ error: "متن پیام را بنویسید" }, { status: 400 });
  if (message.length > FEEDBACK_MESSAGE_MAX) return NextResponse.json({ error: "متن پیام طولانی است" }, { status: 400 });
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) || null : null;
  let phone: string | null = null;
  if (typeof body.phone === "string" && body.phone.trim()) {
    phone = normalizeIranianMobile(body.phone);
    if (!isValidIranianMobile(phone)) return NextResponse.json({ error: "شماره موبایل درست نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)" }, { status: 400 });
  }

  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "پیام‌های زیادی فرستادید؛ چند دقیقه دیگر دوباره تلاش کنید" }, { status: 429 });

  const session = await auth().catch(() => null);
  await prisma.feedback.create({
    data: { kind, role, name, phone, message, userId: session?.user?.id ?? null },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
