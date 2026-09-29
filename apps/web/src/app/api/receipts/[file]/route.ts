import { readFile } from "fs/promises";
import { extname, join } from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadsDir } from "@/lib/privateUploads";

// A stylist's expense receipt (/uploads/expenses/<file>, rewritten here by next.config). Only the
// stylist whose expense points at it gets the file; everyone else — the salon owner included —
// gets a 404, so the response doesn't even confirm the receipt exists.

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};
const NAME = /^[\w-]+\.(?:jpe?g|png|webp|gif)$/i;

const notFound = () => new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, ctx: RouteContext<"/api/receipts/[file]">) {
  const { file } = await ctx.params;
  if (!NAME.test(file)) return notFound();

  const session = await auth();
  if (!session?.user?.id || session.user.role !== "STYLIST") return notFound();

  const owned = await prisma.stylistExpense.findFirst({
    where: { receiptUrl: `/uploads/expenses/${file}`, stylist: { userId: session.user.id } },
    select: { id: true },
  });
  if (!owned) return notFound();

  try {
    const body = await readFile(join(uploadsDir("expenses"), file));
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
