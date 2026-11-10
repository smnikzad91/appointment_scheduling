import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CHAT_COOKIE, sha256 } from "@/lib/livechat/chats";
import { imageOf, readChatImage } from "@/lib/livechat/images";

/** GET: a live chat image — only for that conversation's visitor (cookie) and for platform admins. `?download=1` = save as a file. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(id)) return new Response(null, { status: 404 });
  const msg = await prisma.liveChatMessage.findUnique({ where: { id }, select: { image: true, createdAt: true, chat: { select: { tokenHash: true } } } });
  const image = imageOf(msg?.image);
  if (!msg || !image) return new Response(null, { status: 404 });
  const token = (await cookies()).get(CHAT_COOKIE)?.value;
  const visitor = Boolean(token && token.length <= 100 && sha256(token) === msg.chat.tokenHash);
  if (!visitor) {
    const session = await auth().catch(() => null);
    if (session?.user?.role !== "PLATFORM_ADMIN") return new Response(null, { status: 404 });
  }
  const bytes = await readChatImage(image.file);
  if (!bytes) return new Response(null, { status: 404 });
  const ext = image.file.endsWith(".png") ? "png" : "jpg";
  const headers: Record<string, string> = { "content-type": ext === "png" ? "image/png" : "image/jpeg", "cache-control": "private, max-age=86400", "x-content-type-options": "nosniff" };
  if (new URL(req.url).searchParams.get("download") === "1") {
    // e.g. nobatet-2026-11-06-1432-cmw55e.jpg: sorts well; Tehran time like the rest of the site.
    const t = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(msg.createdAt);
    const part = (k: string) => t.find((x) => x.type === k)?.value ?? "";
    headers["content-disposition"] = `attachment; filename="nobatet-${part("year")}-${part("month")}-${part("day")}-${part("hour")}${part("minute")}-${id.slice(0, 6)}.${ext}"`;
  }
  return new Response(new Uint8Array(bytes), { headers });
}
