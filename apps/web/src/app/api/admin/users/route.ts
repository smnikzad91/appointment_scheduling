import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/types/content";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // closed accounts (lib/userDeletion.ts) are gone from the admin's point of view
  const users = await prisma.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } });

  return NextResponse.json(
    users.map((u) => ({
      id:            u.id,
      firstName:     u.firstName,
      lastName:      u.lastName,
      email:         u.email,
      role:          u.role.toLowerCase() as UserRole,
      walletBalance: u.walletBalance,
      avatar:        u.avatarUrl,
      phone:         u.phone,
      createdAt:     u.createdAt,
    }))
  );
}
