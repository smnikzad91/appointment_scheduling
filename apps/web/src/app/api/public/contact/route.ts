import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, subject, message } = body ?? {};

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim())
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });

  const item = await prisma.contactMessage.create({ data: { name, email, subject, message } });
  return NextResponse.json({ ...item, status: item.status.toLowerCase() }, { status: 201 });
}
