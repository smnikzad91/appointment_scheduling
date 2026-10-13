import { FEEDBACK_KIND_LABEL, type FeedbackKind } from "@/lib/feedback";
import { sendPlatformSms } from "@/lib/notifycloud";

// Texts FEEDBACK_ALERT_PHONE (unset = off) when someone sends a message on /feedback. The form is
// public, so at most 10 alerts per hour per instance; the rest are only in /admin/feedback.

const WINDOW_MS = 60 * 60_000;
const ALERTS_PER_WINDOW = 10;
const PREVIEW_CHARS = 120;
let alertWindow = { start: 0, sent: 0 };

type NewFeedback = { id: string; kind: FeedbackKind; name: string | null; phone: string | null; message: string };

export function feedbackAlertText(f: Omit<NewFeedback, "id">) {
  const who = [f.name, f.phone].filter(Boolean).join(" ") || "ناشناس";
  const preview = f.message.length > PREVIEW_CHARS ? `${f.message.slice(0, PREVIEW_CHARS)}…` : f.message;
  return `نظر جدید در نوبتت (${FEEDBACK_KIND_LABEL[f.kind].fa}) از ${who}:\n${preview}`;
}

export async function alertNewFeedback(f: NewFeedback) {
  const to = process.env.FEEDBACK_ALERT_PHONE?.trim();
  if (!to) return;
  const now = Date.now();
  if (now - alertWindow.start > WINDOW_MS) alertWindow = { start: now, sent: 0 };
  if (alertWindow.sent >= ALERTS_PER_WINDOW) return;
  alertWindow.sent += 1;
  await sendPlatformSms(to, feedbackAlertText(f), `feedback:${f.id}`, "feedback alert");
}
