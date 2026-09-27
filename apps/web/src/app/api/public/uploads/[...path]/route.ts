import { readFile } from "fs/promises";
import { extname, join, resolve, sep } from "path";
import { NextResponse } from "next/server";

// `next start` only serves the public/ files that existed when it started, so a photo uploaded
// afterwards 404s until the next restart. next.config's afterFiles rewrite sends /uploads/* here
// only when no public file matched, and this reads it straight from disk. In dev every file is
// already served by Next itself, so this route only kicks in for new uploads in production.

const UPLOADS = resolve(process.cwd(), "public", "uploads");
const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(_req: Request, ctx: RouteContext<"/api/public/uploads/[...path]">) {
  const { path } = await ctx.params;
  const file = resolve(join(UPLOADS, ...path));
  const type = TYPES[extname(file).toLowerCase()];
  // Only images, and never anything outside public/uploads (no "../" escapes).
  if (!type || !file.startsWith(UPLOADS + sep)) return new NextResponse(null, { status: 404 });
  try {
    const body = await readFile(file);
    // Upload names are random UUIDs and never reused, so a long cache is safe.
    return new NextResponse(body, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=2592000" } });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR" || code === "EISDIR") return new NextResponse(null, { status: 404 });
    throw err;
  }
}
