"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Bell, BellOff, Check, CheckCheck, Clock, ImagePlus, Loader2, MessageCircle, Minus, RotateCcw, Send, X } from "lucide-react";
import { toChatJpeg } from "@/lib/uploadImage";
import { uploadWithProgress } from "@/lib/livechat/uploadWithProgress";
import { ding, primeSound, useChimeMuted } from "@/lib/livechat/ding";
import { CHAT_IMAGE_ACCEPT, CHAT_IMAGE_RULE_FA, chatImageProblem, MESSAGE_MAX, withoutImage, type ChatMessageOut as Msg } from "@/lib/livechat/rules";
import { ChatImageView, UploadOverlay, uploadLabel } from "./ChatImageView";

/** A message on its way; `preview` = local object URL of an image (progress: null = shrinking, 0..1 = uploading). */
type Pending = { cid: string; text: string; failed?: string; preview?: string; progress?: number | null };
type Phase = "start" | "chat";
type PollReply = { code: string; name: string | null; closed: boolean; supportReadAt: string | null; typing: boolean; imagesPurgedAt: string | null; messages: Msg[] };

const time = (iso: string) => new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran" });
const field =
  "w-full rounded-xl border border-app-line bg-app-bg px-3.5 py-2.5 text-sm text-app-ink placeholder:text-app-muted focus:border-app-accent focus:outline-none";
const SAFE_BOTTOM = { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" };
const DELIVERY_LATE = "پیام ذخیره شد و چند دقیقه دیگر خودکار به پشتیبانی می‌رسد.";

/**
 * Floating «گفتگو با پشتیبانی» widget (public pages and the panels): the visitor's messages go to the
 * support Telegram chat, replies come back here. It polls /api/livechat/poll — every 2.5 s while the
 * box is open, every 15 s while it's minimized, 45 s while the tab is hidden — so it works the same
 * through Cloudflare and with several app instances. Renders nothing until LIVECHAT_* is set.
 * `place`: "guest" sits above the public phone tab bar, "panel" above the panels' tab bar.
 */
export default function LiveChat({ place }: { place: "guest" | "panel" }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("start");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [offline, setOffline] = useState(false);
  const [closed, setClosed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [myName, setMyName] = useState("");
  const [contact, setContact] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const [muted, toggleMuted] = useChimeMuted("chat");
  const [typing, setTyping] = useState(false);
  const [supportReadAt, setSupportReadAt] = useState<string | null>(null);
  // Bumping `gen` (re)starts the poll loop for the current conversation; 0 = no conversation.
  const [gen, setGen] = useState(0);
  const purgedSeen = useRef<string | null>(null);
  const readSent = useRef("");
  const cidSeq = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploads = useRef(new Map<string, AbortController>());
  const msgsRef = useRef<Msg[]>([]);
  const openRef = useRef(false);
  useEffect(() => {
    msgsRef.current = msgs;
    openRef.current = open;
  }, [msgs, open]);

  /** Merges one poll reply; the first one (no `after`) replaces the list. */
  const applyPoll = useEffectEvent((r: PollReply, first: boolean) => {
    setPhase("chat");
    setOffline(false);
    setClosed(r.closed);
    setMyName(r.name ?? "");
    setTyping(r.typing && !r.closed);
    setSupportReadAt((cur) => (r.supportReadAt && (!cur || r.supportReadAt > cur) ? r.supportReadAt : cur));
    if (r.imagesPurgedAt && purgedSeen.current !== null && r.imagesPurgedAt !== purgedSeen.current) {
      // the conversation was closed: its image files were deleted on the server
      setMsgs((list) => list.map((x) => (x.image ? { ...x, image: null, text: withoutImage(x.text) } : x)));
    }
    purgedSeen.current = r.imagesPurgedAt ?? "";
    if (first) {
      setMsgs(r.messages);
      return;
    }
    const known = new Set(msgsRef.current.map((m) => m.id));
    const fresh = r.messages.filter((m) => !known.has(m.id));
    if (!fresh.length) return;
    setMsgs((list) => [...list, ...fresh.filter((m) => !list.some((x) => x.id === m.id))]);
    const fromSupport = fresh.filter((m) => m.sender !== "visitor").length;
    if (fresh.some((m) => m.sender === "admin")) ding("chat");
    if (fromSupport && !openRef.current) setUnread((n) => n + fromSupport);
  });

  const onGone = useEffectEvent(() => {
    setPhase("start");
    setMsgs([]);
    setGen(0);
  });

  // The poll loop: one request at a time, paced by whether the box is open and the tab visible.
  useEffect(() => {
    if (!gen) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first = true;
    const tick = async () => {
      try {
        const last = msgsRef.current.at(-1)?.at;
        const res = await fetch(`/api/livechat/poll${!first && last ? `?after=${encodeURIComponent(last)}` : ""}`, { cache: "no-store" });
        if (stop) return;
        if (res.status === 404) return onGone();
        if (!res.ok) throw new Error(String(res.status));
        applyPoll((await res.json()) as PollReply, first);
        first = false;
      } catch {
        if (!stop) setOffline(true);
      }
      if (stop) return;
      const delay = document.visibilityState !== "visible" ? 45_000 : openRef.current ? 2500 : 15_000;
      timer = setTimeout(tick, delay);
    };
    void tick();
    // coming back to the tab (or opening the box) shouldn't wait out a long delay
    const wake = () => {
      if (document.visibilityState !== "visible" || stop) return;
      clearTimeout(timer);
      timer = setTimeout(tick, 100);
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("livechat:wake", wake);
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("livechat:wake", wake);
    };
  }, [gen]);

  // On load: is the chat on, and does this browser have a conversation?
  useEffect(() => {
    let cancelled = false;
    fetch("/api/livechat", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: { enabled?: boolean; active?: boolean; me?: { name: string; contact: string } | null }) => {
        if (cancelled || !s.enabled) return;
        setEnabled(true);
        primeSound();
        if (s.me) {
          setName((v) => v || s.me!.name);
          setContact((v) => v || s.me!.contact);
        }
        if (s.active) setGen((g) => g + 1);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, pending, open, phase, typing]);

  // Tell support the visitor has seen their replies (admin transcript: «خوانده شد») while the box is open and visible.
  const lastAdminAt = msgs.findLast((m) => m.sender === "admin")?.at ?? "";
  useEffect(() => {
    if (!open || phase !== "chat" || !lastAdminAt) return;
    const mark = () => {
      if (document.visibilityState !== "visible" || lastAdminAt <= readSent.current) return;
      readSent.current = lastAdminAt;
      fetch("/api/livechat/read", { method: "POST" }).catch(() => {});
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [open, phase, lastAdminAt]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "Escape" || viewing) return;
    if (confirmEnd) setConfirmEnd(false);
    else setOpen(false);
  });
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => onKey(e);
    document.addEventListener("keydown", h);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", h);
      clearTimeout(t);
    };
  }, [open, phase]);

  const toggle = () => {
    setOpen((v) => !v);
    setUnread(0);
    window.dispatchEvent(new Event("livechat:wake"));
  };

  const start = async () => {
    const text = draft.trim();
    if (!text || starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/livechat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, name, contact, page: location.pathname }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; delivered?: boolean };
      if (!res.ok) {
        setError(data.error ?? "ارسال نشد؛ دوباره امتحان کنید.");
        return;
      }
      setDraft("");
      setClosed(false);
      setMsgs([]);
      purgedSeen.current = null;
      if (data.delivered === false) setError(DELIVERY_LATE);
      setGen((g) => g + 1); // polls the (possibly new) conversation from the start
    } catch {
      setError("اتصال برقرار نشد؛ اینترنت را بررسی کنید.");
    } finally {
      setStarting(false);
    }
  };

  const send = async (text = draft.trim(), retryCid?: string) => {
    if (!text) return;
    const cid = retryCid ?? `c${++cidSeq.current}`;
    setPending((p) => (retryCid ? p.map((x) => (x.cid === cid ? { cid, text } : x)) : [...p, { cid, text }]));
    if (!retryCid) setDraft("");
    setError(null);
    try {
      const res = await fetch("/api/livechat/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const data = (await res.json().catch(() => ({}))) as { message?: Msg; delivered?: boolean; error?: string; closed?: boolean };
      if (!res.ok || !data.message) {
        if (data.closed) setClosed(true);
        throw new Error(data.error ?? "ارسال نشد؛ دوباره امتحان کنید.");
      }
      const msg = data.message;
      setPending((p) => p.filter((x) => x.cid !== cid));
      setMsgs((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
      if (data.delivered === false) setError(DELIVERY_LATE);
    } catch (e) {
      setPending((p) => p.map((x) => (x.cid === cid ? { ...x, failed: e instanceof Error ? e.message : "ارسال نشد." } : x)));
    }
  };

  /** Image (picked or pasted): re-encoded to JPEG in the browser, uploaded with progress; the draft text becomes its caption. */
  const sendImage = async (file: File) => {
    if (phase !== "chat" || closed) return;
    const problem = chatImageProblem(file);
    if (problem) return setError(problem);
    const cid = `i${++cidSeq.current}`;
    const caption = draft.trim();
    const preview = URL.createObjectURL(file);
    setPending((p) => [...p, { cid, text: caption, preview, progress: null }]);
    setDraft("");
    setError(null);
    const abort = new AbortController();
    uploads.current.set(cid, abort);
    const setProgress = (progress: number | null) => setPending((p) => p.map((x) => (x.cid === cid ? { ...x, progress } : x)));
    try {
      const blob = await toChatJpeg(file);
      if (abort.signal.aborted) return;
      const form = new FormData();
      form.set("file", blob, "image.jpg");
      form.set("caption", caption);
      setProgress(0);
      let shown = 0;
      const res = await uploadWithProgress<{ message: Msg; delivered: boolean; error: string }>(
        "/api/livechat/upload",
        form,
        (f) => {
          const pct = Math.floor(f * 100);
          if (pct !== shown) setProgress((shown = pct) / 100);
        },
        abort.signal,
      );
      const msg = res.data.message;
      if (!res.ok || !msg) throw new Error(res.data.error ?? (res.status === 413 ? "حجم تصویر زیاد است." : "ارسال تصویر ناموفق بود."));
      setPending((p) => p.filter((x) => x.cid !== cid));
      setMsgs((list) => (list.some((x) => x.id === msg.id) ? list : [...list, msg]));
      URL.revokeObjectURL(preview);
      if (res.data.delivered === false) setError(DELIVERY_LATE);
    } catch (e) {
      if (abort.signal.aborted) return; // cancelled: already removed
      setPending((p) => p.map((x) => (x.cid === cid ? { ...x, failed: e instanceof Error ? e.message : "ارسال تصویر ناموفق بود." } : x)));
    } finally {
      uploads.current.delete(cid);
    }
  };

  const cancelUpload = (cid: string) => {
    uploads.current.get(cid)?.abort();
    setPending((list) => {
      const item = list.find((x) => x.cid === cid);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return list.filter((x) => x.cid !== cid);
    });
  };

  const newChat = useCallback(() => {
    setGen(0);
    setOffline(false);
    setPhase("start");
    setMsgs([]);
    for (const a of uploads.current.values()) a.abort();
    setPending([]);
    setClosed(false);
    setTyping(false);
    setSupportReadAt(null);
    purgedSeen.current = null;
  }, []);

  /** «✕»: with a conversation, ask first (it ends for good); without one, just hide the box. */
  const askClose = () => {
    if (phase === "chat") setConfirmEnd(true);
    else {
      setOpen(false);
      setDraft("");
      setError(null);
    }
  };

  const endChat = async () => {
    setEnding(true);
    try {
      await fetch("/api/livechat", { method: "DELETE" });
    } catch {
      /* the local reset below still happens; the cookie expires on its own */
    }
    setEnding(false);
    setConfirmEnd(false);
    setOpen(false);
    setUnread(0);
    setDraft("");
    setError(null);
    newChat();
  };

  if (!enabled) return null;
  const submit = () => (phase === "start" ? start() : send());
  const lift = place === "panel" ? "bottom-[calc(76px+env(safe-area-inset-bottom))]" : "bottom-[calc(74px+env(safe-area-inset-bottom))] md:bottom-6";
  const viewed = viewing ? msgs.find((m) => m.id === viewing && m.image) : null;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? "بستن گفتگو" : "گفتگو با پشتیبانی"}
        aria-expanded={open}
        className={`fixed ${lift} left-4 z-[45] flex h-14 w-14 items-center justify-center rounded-full bg-app-accent text-app-accent-ink shadow-[0_10px_30px_-8px_rgb(0_0_0/0.45)] transition-transform hover:scale-105 active:scale-95 sm:left-6 ${open ? "max-sm:hidden" : ""}`}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {unread > 0 && !open && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-black text-white ring-2 ring-app-bg">
            {unread.toLocaleString("fa-IR")}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="گفتگو با پشتیبانی"
          dir="rtl"
          className="fixed inset-0 z-50 flex flex-col overflow-hidden border-app-line bg-app-card shadow-2xl sm:inset-auto sm:bottom-24 sm:left-6 sm:h-[34rem] sm:max-h-[calc(100dvh-8rem)] sm:w-[23rem] sm:rounded-3xl sm:border motion-safe:animate-[app-fade-in_0.2s_ease-out]"
        >
          <header className="flex items-center gap-3 border-b border-app-line bg-app-card-2 px-4 py-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo/nobatet-symbol-v2.png" alt="" className="h-9 w-9 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-app-ink">پشتیبانی نوبتت</h2>
              <p className="flex items-center gap-1.5 text-xs text-app-muted">
                <span className={`h-1.5 w-1.5 rounded-full ${phase === "chat" && offline ? "bg-amber-400" : "bg-emerald-400"}`} />
                {phase === "chat" && offline ? "اتصال قطع شد؛ دوباره وصل می‌شویم…" : "معمولاً در چند دقیقه جواب می‌دهیم"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <IconBtn onClick={toggleMuted} label={muted ? "روشن کردن صدای پیام" : "بی‌صدا کردن پیام‌ها"} pressed={muted}>
                {muted ? <BellOff className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
              </IconBtn>
              <IconBtn onClick={toggle} label="کوچک کردن (گفتگو حفظ می‌شود)">
                <Minus className="h-5 w-5" />
              </IconBtn>
              <IconBtn onClick={askClose} label="بستن گفتگو" danger>
                <X className="h-5 w-5" />
              </IconBtn>
            </div>
          </header>

          {confirmEnd && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm" role="alertdialog" aria-labelledby="chat-end-title" aria-describedby="chat-end-desc">
              <div className="w-full max-w-xs space-y-3 rounded-2xl border border-app-line bg-app-card p-5 shadow-2xl">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-app-danger/15 text-app-danger">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 id="chat-end-title" className="text-base font-bold text-app-ink">
                  گفتگو بسته شود؟
                </h3>
                <p id="chat-end-desc" className="text-xs leading-6 text-app-muted">
                  این گفتگو تمام می‌شود و پیام‌هایش از این صفحه پاک می‌شود. اگر پشتیبانی بعداً جواب بدهد، دیگر اینجا نمی‌بینید. فقط می‌خواهید پنجره را کنار بگذارید؟
                  «کوچک کردن» را بزنید.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" onClick={endChat} disabled={ending} className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-app-danger text-sm font-bold text-white disabled:opacity-60">
                    {ending && <Loader2 className="h-4 w-4 animate-spin" />} بستن گفتگو
                  </button>
                  <button type="button" onClick={() => setConfirmEnd(false)} autoFocus className="min-h-10 rounded-xl border border-app-line bg-app-card-2 text-sm font-bold text-app-ink">
                    انصراف
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmEnd(false);
                    setOpen(false);
                  }}
                  className="flex min-h-9 w-full items-center justify-center gap-1.5 text-xs font-bold text-app-muted hover:text-app-ink"
                >
                  <Minus className="h-3.5 w-3.5" /> کوچک کردن به‌جایش
                </button>
              </div>
            </div>
          )}

          <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto px-3.5 py-4" aria-live="polite">
            <Bubble mine={false} label="پشتیبانی" text="سلام 👋 سؤالتان درباره نوبتت را بنویسید؛ همین‌جا جواب می‌دهیم." />
            {msgs.map((m, i) =>
              m.sender === "system" ? (
                <p key={m.id} className="rounded-xl bg-app-card-2 px-3 py-2 text-center text-xs leading-6 text-app-muted">
                  {m.text}
                </p>
              ) : (
                <Bubble
                  key={m.id}
                  mine={m.sender === "visitor"}
                  label={labelFor(m, msgs[i - 1] ?? GREETING, myName)}
                  text={m.text}
                  image={m.image ? { src: `/api/livechat/file/${m.id}`, ...m.image } : undefined}
                  onOpenImage={m.image ? () => setViewing(m.id) : undefined}
                  meta={
                    m.sender === "visitor" ? (
                      <>
                        {time(m.at)}
                        {supportReadAt && m.at <= supportReadAt ? <CheckCheck className="h-3.5 w-3.5" aria-label="خوانده شد" /> : <Check className="h-3.5 w-3.5" aria-label="ارسال شد" />}
                      </>
                    ) : (
                      time(m.at)
                    )
                  }
                />
              ),
            )}
            {pending.map((p, i) => (
              <div key={p.cid}>
                <Bubble
                  mine
                  label={i === 0 && msgs.at(-1)?.sender !== "visitor" ? myName || name.trim() || "شما" : undefined}
                  text={p.text}
                  image={p.preview ? { src: p.preview, w: 4, h: 3, local: true, progress: p.failed ? undefined : p.progress } : undefined}
                  meta={p.failed ? undefined : p.preview ? <UploadMeta progress={p.progress} onCancel={() => cancelUpload(p.cid)} /> : <Clock className="h-3 w-3" />}
                  dim
                />
                {p.failed && (
                  <p className="mt-1 flex items-center gap-2 text-xs text-app-danger">
                    {p.failed}
                    {p.preview ? (
                      <button type="button" onClick={() => cancelUpload(p.cid)} className="font-bold underline underline-offset-4">
                        حذف
                      </button>
                    ) : (
                      !closed && (
                        <button type="button" onClick={() => send(p.text, p.cid)} className="inline-flex items-center gap-1 font-bold underline underline-offset-4">
                          <RotateCcw className="h-3 w-3" /> دوباره
                        </button>
                      )
                    )}
                  </p>
                )}
              </div>
            ))}
            {typing && phase === "chat" && !closed && (
              <div className="flex flex-col items-end pt-1" role="status">
                <span className="mb-1 px-1 text-[11px] font-bold text-app-muted">پشتیبانی در حال نوشتن…</span>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-app-card-2 px-4 py-3" aria-hidden="true">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-app-muted" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}
            {phase === "chat" && !typing && !error && msgs.length > 0 && msgs.every((m) => m.sender === "visitor") && (
              <p className="flex items-center justify-center gap-1.5 text-center text-xs leading-6 text-app-muted">
                {supportReadAt && (msgs.at(-1)?.at ?? "") <= supportReadAt ? (
                  <>
                    <CheckCheck className="h-3.5 w-3.5 text-sky-500" /> پشتیبانی پیامتان را دید؛ جواب همین‌جا می‌آید.
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" /> پیام به پشتیبانی رسید؛ جواب همین‌جا می‌آید.
                  </>
                )}
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="mx-3.5 mb-2 rounded-xl border border-app-danger/25 bg-app-danger/10 px-3 py-2 text-xs leading-5 text-app-danger">
              {error}
            </p>
          )}

          {phase === "chat" && closed ? (
            <div className="border-t border-app-line p-3.5" style={SAFE_BOTTOM}>
              <button type="button" onClick={newChat} className="min-h-11 w-full rounded-xl bg-app-accent text-sm font-bold text-app-accent-ink">
                شروع گفتگوی تازه
              </button>
            </div>
          ) : (
            <form
              className="space-y-2 border-t border-app-line p-3"
              style={SAFE_BOTTOM}
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {phase === "start" && (
                <div className="grid grid-cols-2 gap-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="نام (اختیاری)" autoComplete="name" className={field} data-no-draft />
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    maxLength={20}
                    placeholder="موبایل (اختیاری)"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    className={`${field} text-right placeholder:text-right`}
                    data-no-draft
                  />
                </div>
              )}
              <div className="flex items-end gap-2">
                {phase === "chat" && (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={CHAT_IMAGE_ACCEPT}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void sendImage(f);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      aria-label="فرستادن تصویر"
                      title={`فرستادن تصویر (${CHAT_IMAGE_RULE_FA}؛ متن نوشته‌شده توضیح تصویر می‌شود)`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-app-line bg-app-card-2 text-app-muted hover:text-app-ink"
                    >
                      <ImagePlus className="h-5 w-5" />
                    </button>
                  </>
                )}
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onPaste={(e) => {
                    const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
                    if (f && phase === "chat") {
                      e.preventDefault();
                      void sendImage(f);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  maxLength={MESSAGE_MAX}
                  placeholder="پیامتان را بنویسید…"
                  aria-label="پیام"
                  className={`${field} max-h-32 resize-none leading-6`}
                  data-no-draft
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || starting}
                  aria-label="ارسال"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-app-accent text-app-accent-ink disabled:opacity-40"
                >
                  {starting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 -scale-x-100" />}
                </button>
              </div>
              {phase === "chat" ? (
                <p className="flex items-center gap-1 text-[11px] leading-5 text-app-muted">
                  <ImagePlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> تصویر: {CHAT_IMAGE_RULE_FA}
                </p>
              ) : (
                <p className="text-[11px] leading-5 text-app-muted">شماره را بگذارید تا اگر از سایت رفتید هم بتوانیم جوابتان را بدهیم.</p>
              )}
            </form>
          )}
        </section>
      )}
      {viewed && <ChatImageView src={`/api/livechat/file/${viewed.id}`} caption={viewed.text} onClose={() => setViewing(null)} />}
    </>
  );
}

const GREETING: Msg = { id: "greeting", sender: "admin", text: "", at: "", image: null };

/** Name above a message: only on the first of a run from the same side. */
function labelFor(m: Msg, prev: Msg, myName: string) {
  if (prev.sender === m.sender) return undefined;
  return m.sender === "visitor" ? myName || "شما" : "پشتیبانی";
}

function IconBtn({ onClick, label, children, pressed, danger }: { onClick: () => void; label: string; children: ReactNode; pressed?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`flex h-9 w-9 items-center justify-center rounded-xl text-app-muted ${danger ? "hover:bg-app-danger/10 hover:text-app-danger" : "hover:bg-app-card hover:text-app-ink"}`}
    >
      {children}
    </button>
  );
}

/** Under an image on its way: what's happening + «لغو». */
function UploadMeta({ progress, onCancel }: { progress?: number | null; onCancel: () => void }) {
  return (
    <>
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      <span aria-live="polite">{uploadLabel(progress)}</span>
      {(progress == null || progress < 1) && (
        <button type="button" onClick={onCancel} className="mr-auto font-bold underline underline-offset-2">
          لغو
        </button>
      )}
    </>
  );
}

type BubbleImage = { src: string; w: number; h: number; local?: boolean; progress?: number | null };

function Bubble({ mine, text, meta, dim, label, image, onOpenImage }: { mine: boolean; text: string; meta?: ReactNode; dim?: boolean; label?: string; image?: BubbleImage; onOpenImage?: () => void }) {
  return (
    <div className={`flex flex-col ${mine ? "items-start" : "items-end"} ${label ? "pt-1" : ""}`}>
      {label && <span className="mb-1 px-1 text-[11px] font-bold text-app-muted">{label}</span>}
      <div
        className={`max-w-[85%] rounded-2xl ${image ? "p-1.5" : "px-3.5 py-2"} whitespace-pre-wrap break-words text-sm leading-6 ${
          mine ? "rounded-tr-md bg-app-accent text-app-accent-ink" : "rounded-tl-md bg-app-card-2 text-app-ink"
        } ${dim ? "opacity-70" : ""}`}
      >
        {image && (
          <button type="button" onClick={onOpenImage} disabled={!onOpenImage} className="relative block cursor-zoom-in disabled:cursor-default" aria-label="نمایش تصویر در اندازه کامل">
            {/* eslint-disable-next-line @next/next/no-img-element -- private, cookie-checked image or a local preview */}
            <img
              src={image.src}
              alt="تصویر پیوست"
              width={image.w}
              height={image.h}
              className={`max-h-64 max-w-full rounded-xl ${image.local ? "h-36 w-48 object-cover" : "h-auto w-auto"}`}
            />
            {image.progress !== undefined && <UploadOverlay progress={image.progress} />}
          </button>
        )}
        {text && <span className={image ? "block px-2 pt-1.5" : undefined}>{text}</span>}
        {meta && <span className={`mt-0.5 flex items-center gap-1 text-[10px] opacity-70 ${image ? "px-2 pb-0.5" : ""}`}>{meta}</span>}
      </div>
    </div>
  );
}
