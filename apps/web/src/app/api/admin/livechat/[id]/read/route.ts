import { sameOrigin } from "@/lib/livechat/config";
import { adminSession } from "@/lib/livechat/admin";
import { markSupportRead } from "@/lib/livechat/chats";

/** POST: an admin has the conversation open in the panel → the visitor sees ✓✓. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req) || !(await adminSession())) return new Response(null, { status: 403 });
  await markSupportRead((await params).id);
  return new Response(null, { status: 204 });
}
