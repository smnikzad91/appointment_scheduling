import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const ticket = await prisma.ticket.findFirst({
    where: { id, userId: session.user.id },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    _id: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    images: ticket.images,
    status: ticket.status.toLowerCase(),
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    replies: ticket.replies.map((r) => ({
      _id: r.id,
      sender: r.sender.toLowerCase(),
      message: r.message,
      images: r.images,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const msg  = ((body.message ?? "") as string).trim();
  const imgs = Array.isArray(body.images) ? (body.images as string[]).slice(0, 5) : [];

  if (msg.length < 5)
    return NextResponse.json({ error: "Reply must be at least 5 characters." }, { status: 400 });
  if (msg.length > 3000)
    return NextResponse.json({ error: "Reply cannot exceed 3000 characters." }, { status: 400 });

  const ticket = await prisma.ticket.findFirst({ where: { id, userId: session.user.id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ticket.status === "CLOSED") {
    return NextResponse.json({ error: "Ticket is closed" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.ticketReply.create({
      data: { ticketId: id, sender: "USER", message: msg, images: imgs },
    }),
    prisma.ticket.update({ where: { id }, data: { status: "OPEN" } }),
  ]);

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { status } = await req.json();

  if (status !== "closed") return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const ticket = await prisma.ticket.findFirst({ where: { id, userId: session.user.id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.ticket.update({ where: { id }, data: { status: "CLOSED" } });

  return NextResponse.json({ success: true });
}
