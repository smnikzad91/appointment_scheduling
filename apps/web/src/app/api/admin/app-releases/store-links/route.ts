import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storeLinks } from "@/lib/appReleases/releases";

// Bazaar / Myket pages of the app, shown on /download-app («به‌زودی» while comingSoon or without a URL).
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "PLATFORM_ADMIN";
}

const url = (v: unknown) => {
  if (typeof v !== "string" || !v.trim()) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
};

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await storeLinks());
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const bazaarUrl = url(body.bazaarUrl);
  const myketUrl = url(body.myketUrl);
  if (bazaarUrl === undefined || myketUrl === undefined) return NextResponse.json({ error: "Store links must start with https://" }, { status: 400 });
  const data = { bazaarUrl, myketUrl, bazaarComingSoon: body.bazaarComingSoon !== false, myketComingSoon: body.myketComingSoon !== false };
  return NextResponse.json(await prisma.appStoreLinks.upsert({ where: { id: "singleton" }, update: data, create: { id: "singleton", ...data } }));
}
