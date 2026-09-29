import { readFile } from "fs/promises";
import { extname, join } from "path";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadsDir } from "@/lib/privateUploads";

// An expense receipt (/uploads/<folder>/<file>, rewritten here by next.config). Only the owner of
// the expense that points at it gets the file: a stylist's receipt ("expenses") only that
// stylist — not their salon's owner — and a salon's ("salon-expenses") only that salon's owner.
// Everyone else gets a 404, so the response doesn't even confirm the receipt exists.

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};
const NAME = /^[\w-]+\.(?:jpe?g|png|webp|gif)$/i;

/** Whether the signed-in user owns an expense whose receipt is `url`. */
const OWNS: Record<string, (user: Session["user"], url: string) => Promise<boolean>> = {
  expenses: async (user, url) =>
    user.role === "STYLIST" &&
    !!(await prisma.stylistExpense.findFirst({ where: { receiptUrl: url, stylist: { userId: user.id } }, select: { id: true } })),
  "salon-expenses": async (user, url) =>
    user.role === "SALON_OWNER" &&
    !!(await prisma.salonExpense.findFirst({ where: { receiptUrl: url, salon: { ownerId: user.id } }, select: { id: true } })),
};

const notFound = () => new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, ctx: RouteContext<"/api/receipts/[folder]/[file]">) {
  const { folder, file } = await ctx.params;
  const owns = OWNS[folder];
  if (!owns || !NAME.test(file)) return notFound();

  const session = await auth();
  if (!session?.user?.id || !(await owns(session.user, `/uploads/${folder}/${file}`))) return notFound();

  try {
    const body = await readFile(join(uploadsDir(folder), file));
    // Private: only the signed-in browser may keep a copy, never a shared cache.
    return new NextResponse(body, {
      headers: { "Content-Type": TYPES[extname(file).toLowerCase()], "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR" || code === "EISDIR") return notFound();
    throw err;
  }
}
