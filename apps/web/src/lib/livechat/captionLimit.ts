// Caption edits per conversation: 20 an hour (each one posts a note to Telegram; in memory, per process).
const g = globalThis as unknown as { __nobatetChatEdits?: Map<string, number[]> };
const edits: Map<string, number[]> = (g.__nobatetChatEdits ??= new Map<string, number[]>());

export function allowCaptionEdit(chatId: string) {
  const now = Date.now();
  const list = (edits.get(chatId) ?? []).filter((t) => now - t < 3_600_000);
  if (list.length >= 20) return false;
  list.push(now);
  edits.set(chatId, list);
  if (edits.size > 5000) edits.clear();
  return true;
}
