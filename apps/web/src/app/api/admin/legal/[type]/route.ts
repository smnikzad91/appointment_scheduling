import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LegalPageType as PrismaLegalPageType } from "@appointment-scheduling/database";

type Params = { params: Promise<{ type: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { type } = await params;
  if (type !== "privacy" && type !== "terms")
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const page = await prisma.legalPage.findUnique({ where: { type: type.toUpperCase() as PrismaLegalPageType } });
  return NextResponse.json(page ?? { type, title: "", content: "" });
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { type } = await params;
  if (type !== "privacy" && type !== "terms")
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const { title, content } = await req.json();
  const prismaType = type.toUpperCase() as PrismaLegalPageType;
  const page = await prisma.legalPage.upsert({
    where: { type: prismaType },
    create: { type: prismaType, title, content },
    update: { title, content },
  });
  return NextResponse.json(page);
}
