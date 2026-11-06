import { NextResponse } from "next/server";
import { liveChatConfigured } from "@/lib/livechat/config";
import { adminSession, CHAT_FILTERS, chatCounts, listChats, type ChatFilter } from "@/lib/livechat/admin";
import { visitorOnline } from "@/lib/livechat/chats";

/** GET ?filter=&q=: live chat conversations for /admin/live-chat. */
export async function GET(req: Request) {
  if (!(await adminSession())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = new URL(req.url).searchParams;
  const filter = (CHAT_FILTERS as string[]).includes(sp.get("filter") ?? "") ? (sp.get("filter") as ChatFilter) : "all";
  const q = (sp.get("q") ?? "").slice(0, 60);
  const [rows, counts] = await Promise.all([listChats(filter, q), chatCounts()]);
  const now = Date.now();
  return NextResponse.json(
    { configured: liveChatConfigured(), counts, items: rows.map(({ visitorSeenAt, ...r }) => ({ ...r, online: visitorOnline({ visitorSeenAt }, now) })) },
    { headers: { "cache-control": "no-store" } },
  );
}
