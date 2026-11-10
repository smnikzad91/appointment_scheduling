import { NextResponse } from "next/server";
import { prisma, isPrismaNotFound } from "@/lib/prisma";
import { sameOrigin } from "@/lib/livechat/config";
import { adminSession } from "@/lib/livechat/admin";
import { parseQuickReply } from "@/lib/livechat/quickReplyInput";

type Ctx = { params: Promise<{ id: string }> };
const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

/** PATCH: edit a saved answer (the whole thing, as the form sends it). */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!sameOrigin(req) || !(await adminSession())) return forbidden();
  const { id } = await params;
  const parsed = parseQuickReply(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const clash = await prisma.liveChatQuickReply.findUnique({ where: { key: parsed.value.key } });
  if (clash && clash.id !== id) return NextResponse.json({ error: "lcQrKeyTaken" }, { status: 409 });
  try {
    return NextResponse.json(await prisma.liveChatQuickReply.update({ where: { id }, data: parsed.value }));
  } catch (err) {
    if (isPrismaNotFound(err)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  if (!sameOrigin(req) || !(await adminSession())) return forbidden();
  const { id } = await params;
  await prisma.liveChatQuickReply.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
