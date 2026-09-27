import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/errorLog";

const IRANIAN_MOBILE = /^09[0-9]{9}$/;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    firstName:     user.firstName,
    lastName:      user.lastName,
    email:         user.email,
    phone:         user.phone ?? "",
    walletBalance: user.walletBalance ?? 0,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;

  if (phone === undefined) {
    return NextResponse.json({ error: "Invalid phone value" }, { status: 400 });
  }

  // Allow clearing the phone — only validate format when non-empty
  if (phone !== "" && !IRANIAN_MOBILE.test(phone)) {
    return NextResponse.json(
      { error: "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد (مثال: ۰۹۱۱۹۱۰۰۹۹۱)" },
      { status: 400 }
    );
  }

  // Check uniqueness when phone is non-empty
  if (phone !== "") {
    const existing = await prisma.user.findFirst({
      where: { phone, id: { not: session.user.id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "این شماره موبایل قبلاً توسط حساب دیگری ثبت شده است" },
        { status: 409 }
      );
    }
  }

  try {
    // Store cleared phone as NULL, not "" — Postgres allows multiple NULLs under
    // a unique constraint, so two users can both have no phone at once.
    await prisma.user.update({ where: { id: session.user.id }, data: { phone: phone || null } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const isdup = (err as { code?: string }).code === "P2002";
    if (isdup) {
      return NextResponse.json(
        { error: "این شماره موبایل قبلاً توسط حساب دیگری ثبت شده است" },
        { status: 409 }
      );
    }
    await logError({ error: err, method: "PATCH", path: "/api/user/profile", statusCode: 500, userId: session.user.id });
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
