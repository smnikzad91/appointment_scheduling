import { prisma } from "@/lib/prisma";
import { hasKeyword } from "./fold";

export function listQuickReplies() {
  return prisma.liveChatQuickReply.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
}

/** The first automatic answer whose keyword appears in the text and that this chat hasn't had yet. */
export async function matchAutoReply(text: string, alreadySent: string[]) {
  const replies = await prisma.liveChatQuickReply.findMany({ where: { autoReply: true, id: { notIn: alreadySent } }, orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  return replies.find((r) => hasKeyword(text, r.keywords)) ?? null;
}

export const QUICK_KEY = /^[a-z0-9-]{1,30}$/;
