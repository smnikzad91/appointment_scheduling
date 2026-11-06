import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { lookupGeo } from "@/lib/analytics/record";
import { isValidIranianMobile, normalizeIranianMobile } from "@/lib/persian";
import { liveChatConfigured, sameOrigin } from "@/lib/livechat/config";
import { CHAT_COOKIE, CHAT_COOKIE_DAYS, chatByToken, cleanText, createChat, endChatByVisitor, rateChat, visitorSend } from "@/lib/livechat/chats";

const fail = (error: string, status = 400) => Response.json({ error }, { status });

/** The signed-in account's name and mobile, to prefill the start form (and link the chat to it). */
async function signedIn() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return null;
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, firstName: true, lastName: true, phone: true, deletedAt: true } });
  return u && !u.deletedAt ? u : null;
}

/** GET: is the chat on, and does this browser have a conversation? (the cookie is httpOnly, so the widget asks). */
export async function GET() {
  if (!liveChatConfigured()) return Response.json({ enabled: false }, { headers: { "cache-control": "no-store" } });
  const [chat, me] = await Promise.all([chatByToken((await cookies()).get(CHAT_COOKIE)?.value), signedIn()]);
  return Response.json(
    {
      enabled: true,
      active: Boolean(chat),
      closed: Boolean(chat?.closedAt),
      me: me ? { name: [me.firstName, me.lastName].filter(Boolean).join(" "), contact: me.phone ?? "" } : null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

// New conversations per IP: 5 an hour (in memory, per process).
const g = globalThis as unknown as { __nobatetChatStarts?: Map<string, number[]> };
const starts: Map<string, number[]> = (g.__nobatetChatStarts ??= new Map<string, number[]>());
function allowStart(ip: string) {
  const now = Date.now();
  const list = (starts.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= 5) return false;
  list.push(now);
  starts.set(ip, list);
  if (starts.size > 5000) starts.clear();
  return true;
}

/** Optional mobile from the start form: "" when empty, «09…» when valid, false otherwise. */
function normalizeContact(raw: unknown): string | false {
  const v = String(raw ?? "").replace(/\p{Cf}/gu, "").trim().slice(0, 40);
  if (!v) return "";
  const phone = normalizeIranianMobile(v);
  return isValidIranianMobile(phone) ? phone : false;
}

/** POST {text, name?, contact?, page?}: starts a conversation with its first message and sets the cookie. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  if (!liveChatConfigured()) return fail("گفتگوی آنلاین فعلاً در دسترس نیست.", 503);
  const body = (await req.json().catch(() => null)) as { text?: unknown; name?: unknown; contact?: unknown; page?: unknown } | null;
  const text = cleanText(body?.text);
  if (!text) return fail("پیامتان را بنویسید.");
  const name = cleanText(body?.name, 60).replace(/\n/g, " ");
  const contact = normalizeContact(body?.contact);
  if (contact === false) return fail("شماره موبایل درست نیست؛ مثلاً ۰۹۱۲۱۲۳۴۵۶۷ (یا خالی بگذارید).");
  const page = typeof body?.page === "string" && body.page.startsWith("/") ? body.page.slice(0, 300) : null;

  const jar = await cookies();
  let chat = await chatByToken(jar.get(CHAT_COOKIE)?.value);
  if (!chat || chat.closedAt) {
    const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    if (!allowStart(ip || "?")) return fail("تعداد گفتگوهای تازه زیاد بود؛ کمی بعد دوباره امتحان کنید.", 429);
    const cfCountry = req.headers.get("cf-ipcountry");
    const cfCity = req.headers.get("cf-ipcity");
    const geo = cfCountry ? null : lookupGeo(ip);
    const me = await signedIn();
    const created = await createChat({
      name,
      contact,
      userId: me?.id ?? null,
      page,
      country: cfCountry ?? geo?.country ?? null,
      city: cfCity ? decodeURIComponent(cfCity) : (geo?.city ?? null),
    });
    chat = created.chat;
    jar.set(CHAT_COOKIE, created.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: CHAT_COOKIE_DAYS * 86_400 });
  }
  const { delivered } = await visitorSend(chat, text);
  return Response.json({ ok: true, delivered });
}

/** DELETE {rating?: 1 | -1}: the visitor closes the conversation («بستن گفتگو»), optionally rating it: ended for good, cookie removed. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("forbidden", 403);
  const jar = await cookies();
  const chat = await chatByToken(jar.get(CHAT_COOKIE)?.value);
  const body = (await req.json().catch(() => null)) as { rating?: unknown } | null;
  if (chat && (body?.rating === 1 || body?.rating === -1)) await rateChat(chat, body.rating);
  if (chat) await endChatByVisitor(chat);
  jar.delete(CHAT_COOKIE);
  return Response.json({ ok: true });
}
