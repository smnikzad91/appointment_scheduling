"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Loader2, Send } from "lucide-react";
import Sheet from "./Sheet";
import { cx } from "./ui";
import { toastError } from "@/lib/toastError";
import { persianApiError } from "@/lib/api/errorMessages";
import { formatSalonDateTime } from "@/lib/salonTime";
import { getAppointmentChat, markAppointmentChatRead, sendAppointmentMessage, type AppointmentChat } from "@/lib/api/appointmentChat";

/**
 * A booking's chat («دیر می‌رسم»، «آدرس کجاست؟») between the customer and the salon — for the customer
 * on their bookings, for the owner / stylist from the appointment sheet. Polls every 4 s while open and
 * marks the other side's messages read. `subtitle` says who it's with and which booking.
 */
export default function AppointmentChatSheet({
  token,
  appointmentId,
  title,
  subtitle,
  onClose,
  onRead,
  themeClassName,
}: {
  token: string;
  appointmentId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** The other side's messages were marked read (clear the list's badge). */
  onRead?: () => void;
  themeClassName?: string;
}) {
  const [chat, setChat] = useState<AppointmentChat | null>(null);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const readFor = useRef("");

  const load = useCallback(() => {
    getAppointmentChat(token, appointmentId)
      .then((c) => {
        setChat(c);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [token, appointmentId]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 4000);
    return () => clearInterval(t);
  }, [load]);

  // The other side's newest message on screen → read (their ✓✓, and the bell notice goes).
  const lastOther = chat?.messages.findLast((m) => !m.mine)?.at ?? "";
  useEffect(() => {
    if (!chat || lastOther === readFor.current) return;
    readFor.current = lastOther;
    markAppointmentChatRead(token, appointmentId)
      .then(() => onRead?.())
      .catch(() => {});
  }, [chat, lastOther, token, appointmentId, onRead]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat?.messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const m = await sendAppointmentMessage(token, appointmentId, text);
      setDraft("");
      setChat((c) => c && { ...c, messages: [...c.messages, m] });
    } catch (err) {
      toastError(persianApiError(err, "پیام فرستاده نشد؛ دوباره امتحان کنید"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={title} themeClassName={themeClassName}>
      {subtitle && <p className="-mt-2 mb-3 text-[13px] text-app-muted">{subtitle}</p>}
      <div ref={listRef} className="flex max-h-[50dvh] min-h-40 flex-col gap-2 overflow-y-auto pb-2" aria-live="polite">
        {!chat ? (
          failed ? (
            <p className="py-8 text-center text-sm text-app-danger">بارگذاری پیام‌ها ممکن نشد.</p>
          ) : (
            <Loader2 className="mx-auto my-10 h-5 w-5 animate-spin text-app-muted" />
          )
        ) : chat.messages.length === 0 ? (
          <p className="py-8 text-center text-sm leading-7 text-app-muted">
            {chat.side === "CUSTOMER" ? "پیامی برای سالن بنویسید؛ مثلاً اگر دیر می‌رسید یا سؤالی درباره نوبت دارید." : "هنوز پیامی رد و بدل نشده است."}
          </p>
        ) : (
          chat.messages.map((m, i) => {
            const label = chat.messages[i - 1]?.senderName !== m.senderName;
            return (
              <div key={m.id} className={cx("flex flex-col", m.mine ? "items-start" : "items-end")}>
                {label && <span className="mb-0.5 px-1 text-[11px] font-bold text-app-muted">{m.mine ? "شما" : m.senderName}</span>}
                <div
                  className={cx(
                    "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-6",
                    m.mine ? "rounded-tr-md bg-app-accent text-app-accent-ink" : "rounded-tl-md bg-app-card-2 text-app-ink",
                  )}
                >
                  {m.text}
                  <span className="mt-0.5 flex items-center gap-1 text-[10px] opacity-70">
                    {formatSalonDateTime(m.at)}
                    {m.mine && (chat.otherReadAt && chat.otherReadAt >= m.at ? <CheckCheck className="h-3.5 w-3.5" aria-label="خوانده شد" /> : <Check className="h-3.5 w-3.5" aria-label="فرستاده شد" />)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      {chat && !chat.canWrite ? (
        <p className="mt-2 rounded-2xl bg-app-card-2 px-3.5 py-2.5 text-center text-xs text-app-muted">گفتگوی این نوبت بسته است (لغو شده یا بیش از یک روز از آن گذشته).</p>
      ) : (
        <form
          className="mt-2 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="پیام…"
            aria-label="پیام"
            disabled={!chat}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-app-line bg-app-bg px-3.5 py-2.5 text-[16px] leading-6 text-app-ink outline-none focus:border-app-accent"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending || !chat}
            aria-label="ارسال"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-accent text-app-accent-ink disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 -scale-x-100" />}
          </button>
        </form>
      )}
    </Sheet>
  );
}
