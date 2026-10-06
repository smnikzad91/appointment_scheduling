import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Body `{ ids }`: every plan id in the new display order. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { ids } = await req.json();
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string") || new Set(ids).size !== ids.length)
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });

  await prisma.$transaction(
    ids.map((id: string, i: number) => prisma.pricingPlan.updateMany({ where: { id }, data: { sortOrder: i + 1 } })),
  );
  return NextResponse.json({ ok: true });
}
