/** Reactions on chat images (one per side; double-tap = the first). Shared by the widget, the panel and the API. */
export const REACTIONS = ["❤️", "👍", "😂", "😮", "😢", "🙏"] as const;
export type Reaction = (typeof REACTIONS)[number];
export const LIKE: Reaction = REACTIONS[0];
export const REACTION_NAMES: Record<Reaction, string> = { "❤️": "قلب", "👍": "لایک", "😂": "خنده", "😮": "تعجب", "😢": "ناراحت", "🙏": "ممنون" };
export const REACTION_NAMES_EN: Record<Reaction, string> = { "❤️": "heart", "👍": "like", "😂": "laugh", "😮": "wow", "😢": "sad", "🙏": "thanks" };
export const isReaction = (v: unknown): v is Reaction => typeof v === "string" && (REACTIONS as readonly string[]).includes(v);
/** Each side's reaction to one image (null = none). */
export type ImageReactions = { visitor: Reaction | null; support: Reaction | null };
