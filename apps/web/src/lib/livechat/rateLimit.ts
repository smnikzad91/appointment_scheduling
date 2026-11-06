// Visitor flood limits per conversation: 6 messages / 20 s and 60 / hour (in memory, per process).
const g = globalThis as unknown as { __nobatetChatSent?: Map<string, number[]> };
const sent: Map<string, number[]> = (g.__nobatetChatSent ??= new Map<string, number[]>());

export function allowSend(chatId: string) {
  const now = Date.now();
  const list = (sent.get(chatId) ?? []).filter((t) => now - t < 3_600_000);
  if (list.filter((t) => now - t < 20_000).length >= 6 || list.length >= 60) return false;
  list.push(now);
  sent.set(chatId, list);
  if (sent.size > 5000) sent.clear();
  return true;
}
