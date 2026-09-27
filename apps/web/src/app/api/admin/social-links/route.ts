import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SocialPlatform as PrismaSocialPlatform } from "@appointment-scheduling/database";
import type { SocialPlatform } from "@/types/content";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const links = await prisma.socialLink.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json(links.map((l) => ({
    id: l.id, platform: l.platform.toLowerCase() as SocialPlatform, url: l.url,
    label: l.label, active: l.active, order: l.order,
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { platform, url, label, active, order } = await req.json();
  if (!platform || !url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const link = await prisma.socialLink.create({
    data: {
      platform: (platform as string).toUpperCase() as PrismaSocialPlatform,
      url,
      label: label ?? "",
      active: active ?? true,
      order: order ?? 0,
    },
  });
  return NextResponse.json({ id: link.id }, { status: 201 });
}
