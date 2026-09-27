import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LegalPageType as PrismaLegalPageType } from "@appointment-scheduling/database";

type Params = { params: Promise<{ type: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { type } = await params;
  if (type !== "privacy" && type !== "terms")
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const page = await prisma.legalPage.findUnique({ where: { type: type.toUpperCase() as PrismaLegalPageType } });
  return NextResponse.json(page ?? { type, title: "", content: "" });
}
