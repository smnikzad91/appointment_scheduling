import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SINGLETON_ID = "singleton";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const seo = await prisma.siteSeo.findFirst();
  return NextResponse.json(seo ?? { title: "", description: "", keywords: [] });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, description, keywords } = await req.json();
  const existing = await prisma.siteSeo.findFirst();
  const seo = existing
    ? await prisma.siteSeo.update({ where: { id: existing.id }, data: { title, description, keywords } })
    : await prisma.siteSeo.create({ data: { id: SINGLETON_ID, title, description, keywords } });
  return NextResponse.json(seo);
}
