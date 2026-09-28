import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma, isPrismaNotFound } from "@/lib/prisma";
import { parsePlanInput } from "@/lib/pricingInput";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = parsePlanInput(await req.json());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const plan = await prisma.$transaction(async (tx) => {
      if (parsed.data.recommended) {
        await tx.pricingPlan.updateMany({ where: { id: { not: id } }, data: { recommended: false } });
      }
      return tx.pricingPlan.update({ where: { id }, data: parsed.data });
    });
    return NextResponse.json(plan);
  } catch (err) {
    if (isPrismaNotFound(err)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.pricingPlan.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
