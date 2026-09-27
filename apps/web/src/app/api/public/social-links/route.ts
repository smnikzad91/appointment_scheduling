import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SocialPlatform } from "@/types/content";

export async function GET() {
  const links = await prisma.socialLink.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(links.map((l) => ({
    id: l.id, platform: l.platform.toLowerCase() as SocialPlatform, url: l.url, label: l.label,
  })));
}
