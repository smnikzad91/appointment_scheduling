import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Wire format keeps the original "admin"/"user" roles; the Postgres Role enum
// has more values (PLATFORM_ADMIN/SALON_OWNER/STYLIST/CUSTOMER) for the
// salon-domain product, so we collapse to the two legacy values here.
function toWireRole(role: string): "admin" | "user" {
  return role === "PLATFORM_ADMIN" ? "admin" : "user";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return NextResponse.json(
    users.map((u) => ({
      id:            u.id,
      firstName:     u.firstName,
      lastName:      u.lastName,
      email:         u.email,
      role:          toWireRole(u.role),
      walletBalance: u.walletBalance,
      avatar:        u.avatarUrl,
      phone:         u.phone,
      createdAt:     u.createdAt,
    }))
  );
}
