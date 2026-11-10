import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sameOrigin } from "@/lib/livechat/config";
import { adminSession } from "@/lib/livechat/admin";
import { listQuickReplies } from "@/lib/livechat/quickReplies";
import { parseQuickReply } from "@/lib/livechat/quickReplyInput";

const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

/** GET: the live chat's saved answers. */
export async function GET() {
  if (!(await adminSession())) return forbidden();
  return NextResponse.json(await listQuickReplies(), { headers: { "cache-control": "no-store" } });
}

/** POST {key, title, text, keywords, autoReply, order}: a new saved answer. */
export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await adminSession())) return forbidden();
  const parsed = parseQuickReply(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (await prisma.liveChatQuickReply.findUnique({ where: { key: parsed.value.key } })) return NextResponse.json({ error: "lcQrKeyTaken" }, { status: 409 });
  return NextResponse.json(await prisma.liveChatQuickReply.create({ data: parsed.value }));
}
