import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CHAT_COOKIE, sha256 } from "@/lib/livechat/chats";
import { imageOf, readChatImage } from "@/lib/livechat/images";

/** GET: a live chat image — only for that conversation's visitor (cookie) and for platform admins. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(id)) return new Response(null, { status: 404 });
  const msg = await prisma.liveChatMessage.findUnique({ where: { id }, select: { image: true, chat: { select: { tokenHash: true } } } });
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
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": image.file.endsWith(".png") ? "image/png" : "image/jpeg", "cache-control": "private, max-age=86400", "x-content-type-options": "nosniff" },
  });
}
