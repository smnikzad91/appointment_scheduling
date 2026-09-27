import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { TicketStatus, TicketReplySender } from "@/types/content";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tickets = await prisma.ticket.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      replies: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { replies: true } },
    },
  });

  return NextResponse.json(
    tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status.toLowerCase() as TicketStatus,
      replyCount: t._count.replies,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      user: t.user ? {
        name: `${t.user.firstName ?? ""} ${t.user.lastName ?? ""}`.trim(),
        email: t.user.email ?? "",
      } : null,
      lastReply: t.replies.length > 0
        ? { sender: t.replies[0].sender.toLowerCase() as TicketReplySender }
        : null,
    }))
  );
}
