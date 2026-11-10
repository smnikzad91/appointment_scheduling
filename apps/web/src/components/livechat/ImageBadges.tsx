import { MessageCircle } from "lucide-react";

/** Corner of a chat image's thumbnail: the reactions on it (who reacted how, in the label) and 💬 + its comment count. */
export function ImageBadges({ reactions = [], comments = 0, en = false }: { reactions?: { who: string; emoji: string }[]; comments?: number; en?: boolean }) {
  if (!reactions.length && !comments) return null;
  const n = (v: number) => v.toLocaleString(en ? "en-US" : "fa-IR");
  const parts = [
    reactions.length ? `${en ? "Reactions" : "واکنش‌ها"}: ${reactions.map((r) => `${r.who} ${r.emoji}`).join(en ? ", " : "، ")}` : "",
    comments ? `${n(comments)} ${en ? (comments === 1 ? "comment" : "comments") : "نظر"}` : "",
  ].filter(Boolean);
  const label = parts.join(en ? "; " : "؛ ");
  const emojis = [...new Set(reactions.map((r) => r.emoji))];
  return (
    <span role="img" aria-label={label} title={label} className="pointer-events-none absolute bottom-1.5 left-1.5 flex h-6 items-center gap-1.5 rounded-full bg-black/55 px-1.5 text-white backdrop-blur">
      {emojis.length > 0 && <span className="text-[13px] leading-none tracking-tight">{emojis.join("")}</span>}
      {comments > 0 && (
        <span className="flex items-center gap-0.5">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[10px] font-bold tabular-nums">{n(comments)}</span>
        </span>
      )}
    </span>
  );
}
