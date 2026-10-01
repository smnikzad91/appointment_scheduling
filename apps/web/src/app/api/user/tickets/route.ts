import { NextRequest, NextResponse } from "next/server";
import { requestSession } from "@/lib/requestSession";
import { prisma } from "@/lib/prisma";
import type { TicketStatus, TicketReplySender } from "@/types/content";

export async function GET() {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await prisma.ticket.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      replies: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { replies: true } },
    },
  });

  return NextResponse.json(tickets.map((t) => ({
    id:         t.id,
    subject:    t.subject,
    status:     t.status.toLowerCase() as TicketStatus,
    replyCount: t._count.replies,
    createdAt:  t.createdAt,
    updatedAt:  t.updatedAt,
    lastReply:  t.replies.length > 0
      ? { sender: t.replies[0].sender.toLowerCase() as TicketReplySender }
      : null,
  })));
}

const SUBJECT_MIN = 5;
const SUBJECT_MAX = 200;
const MESSAGE_MIN = 20;
const MESSAGE_MAX = 3000;

export async function POST(req: NextRequest) {
  const session = await requestSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sub  = ((body.subject ?? "") as string).trim();
  const msg  = ((body.message ?? "") as string).trim();
  const imgs = Array.isArray(body.images) ? (body.images as string[]).slice(0, 5) : [];

  if (sub.length < SUBJECT_MIN)
    return NextResponse.json({ error: `Subject must be at least ${SUBJECT_MIN} characters.` }, { status: 400 });
  if (sub.length > SUBJECT_MAX)
    return NextResponse.json({ error: `Subject cannot exceed ${SUBJECT_MAX} characters.` }, { status: 400 });
  if (msg.length < MESSAGE_MIN)
    return NextResponse.json({ error: `Message must be at least ${MESSAGE_MIN} characters.` }, { status: 400 });
  if (msg.length > MESSAGE_MAX)
    return NextResponse.json({ error: `Message cannot exceed ${MESSAGE_MAX} characters.` }, { status: 400 });

  const ticket = await prisma.ticket.create({
    data: {
      userId:  session.user.id,
      subject: sub,
      message: msg,
      images:  imgs,
    },
  });

  return NextResponse.json({ id: ticket.id }, { status: 201 });
}
