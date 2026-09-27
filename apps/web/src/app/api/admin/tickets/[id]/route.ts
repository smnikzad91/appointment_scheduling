import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TicketStatus as PrismaTicketStatus } from "@appointment-scheduling/database";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") return null;
  return session;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
      replies: { orderBy: { createdAt: "asc" } },
    },
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
    userId: ticket.user ? {
      firstName: ticket.user.firstName,
      lastName: ticket.user.lastName,
      email: ticket.user.email,
      avatar: ticket.user.avatarUrl,
    } : null,
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
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const msg  = ((body.message ?? "") as string).trim();
  const imgs = Array.isArray(body.images) ? (body.images as string[]).slice(0, 5) : [];

  if (msg.length < 5)
    return NextResponse.json({ error: "Reply must be at least 5 characters." }, { status: 400 });
  if (msg.length > 3000)
    return NextResponse.json({ error: "Reply cannot exceed 3000 characters." }, { status: 400 });

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.ticketReply.create({
      data: { ticketId: id, sender: "ADMIN", message: msg, images: imgs },
    }),
    prisma.ticket.update({ where: { id }, data: { status: "ANSWERED" } }),
  ]);

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { status } = await req.json();

  if (!["open", "answered", "closed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status: (status as string).toUpperCase() as PrismaTicketStatus },
    });
    return NextResponse.json({ success: true, status: ticket.status.toLowerCase() });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
