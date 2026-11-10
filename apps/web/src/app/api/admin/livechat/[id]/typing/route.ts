import { sameOrigin } from "@/lib/livechat/config";
import { adminSession } from "@/lib/livechat/admin";
import { notifyTyping } from "@/lib/livechat/chats";

/** POST: an admin is typing a reply in the panel → the visitor sees the typing dots. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req) || !(await adminSession())) return new Response(null, { status: 403 });
  await notifyTyping((await params).id);
  return new Response(null, { status: 204 });
}
