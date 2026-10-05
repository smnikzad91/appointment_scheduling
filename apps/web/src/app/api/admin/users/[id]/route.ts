import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isPrismaNotFound, prisma } from "@/lib/prisma";
import { Role } from "@appointment-scheduling/database";

// Salon owners and stylists are tied to their Salon/Stylist rows, so the admin can only
// move an account between customer and platform admin; the other roles are set by
// apps/api (salon sign-up, stylist invites).
const ASSIGNABLE: Record<string, Role> = {
  platform_admin: Role.PLATFORM_ADMIN,
  customer: Role.CUSTOMER,
};

function prismaCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null ? (err as { code?: string }).code : undefined;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { role, phone } = body;

  const update: { role?: Role; phone?: string | null } = {};

  if (role !== undefined) {
    const next = ASSIGNABLE[role];
    if (!next) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    const current = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (current.role !== next) {
      if (!Object.values(ASSIGNABLE).includes(current.role)) {
        return NextResponse.json({ error: "Salon owner and stylist roles can't be changed" }, { status: 400 });
      }
      if (id === session.user.id) {
        return NextResponse.json({ error: "You can't change your own role" }, { status: 400 });
      }
      update.role = next;
    }
  }

  if (phone !== undefined) {
    if (phone !== null && typeof phone !== "string") {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }
    // Never "" — NULLs don't collide under the unique constraint, empty strings do.
    update.phone = phone?.trim() || null;
  }

  try {
    await prisma.user.update({ where: { id }, data: update });
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (prismaCode(err) === "P2002") {
      return NextResponse.json({ error: "This phone number belongs to another user" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  try {
    await prisma.user.deleteMany({ where: { id } });
  } catch (err: unknown) {
    // A salon, stylist profile, bookings or wallet top-ups still point at this user.
    if (prismaCode(err) === "P2003") {
      return NextResponse.json({ error: "This user has a salon, bookings or payments and can't be deleted" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
