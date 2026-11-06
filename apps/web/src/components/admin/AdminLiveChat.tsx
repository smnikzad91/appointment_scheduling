"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, BellOff, ChevronLeft, ImagePlus, Loader2, Lock, MapPin, MessageSquareText, Search, Send, User } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import { toastError } from "@/lib/toastError";
import { toChatJpeg } from "@/lib/uploadImage";
import { uploadWithProgress } from "@/lib/livechat/uploadWithProgress";
import { useChimeMuted } from "@/lib/livechat/ding";
import { CHAT_IMAGE_ACCEPT, chatImageProblem } from "@/lib/livechat/rules";
import { UploadOverlay } from "@/components/livechat/UploadProgress";
import { ImageLightbox, type LightboxItem } from "@/components/livechat/ImageLightbox";
import { ImageBadges } from "@/components/livechat/ImageBadges";
import type { ImageReactions, Reaction } from "@/lib/livechat/reactions";

type Filter = "all" | "waiting" | "open" | "closed" | "ended";
const FILTERS: { id: Filter; label: TranslationKey }[] = [
  { id: "all", label: "lcFilterAll" },
  { id: "waiting", label: "lcFilterWaiting" },
  { id: "open", label: "lcFilterOpen" },
  { id: "closed", label: "lcFilterClosed" },
  { id: "ended", label: "lcFilterEnded" },
];

type Row = {
  id: string;
  code: string;
  name: string | null;
  contact: string | null;
  userId: string | null;
  closedAt: string | null;
  endedByVisitor: boolean;
  lastMessageAt: string;
  lastSender: "VISITOR" | "ADMIN" | null;
  lastText: string | null;
  total: number;
  undelivered: number;
  online: boolean;
};
type Transcript = {
  chat: {
    id: string;
    code: string;
    name: string | null;
    contact: string | null;
    page: string | null;
    country: string | null;
    city: string | null;
    closedAt: string | null;
    endedByVisitor: boolean;
    visitorReadAt: string | null;
    createdAt: string;
    online: boolean;
  };
  user: { id: string; firstName: string; lastName: string; phone: string | null; role: string } | null;
  messages: {
    id: string;
    sender: "VISITOR" | "ADMIN" | "SYSTEM";
    text: string;
    author: string | null;
    at: string;
    delivered: boolean;
    image: { w: number; h: number } | null;
    reactions: ImageReactions | null;
    edited: boolean;
    replyTo: string | null;
  }[];
};

const pill = (tone: "warn" | "good" | "none") =>
  `rounded-full px-2.5 py-0.5 text-xs ${
    tone === "warn" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : tone === "good" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
  }`;

function Status({ closedAt, endedByVisitor, lastSender }: { closedAt: string | null; endedByVisitor: boolean; lastSender: string | null }) {
  const t = useT();
  if (endedByVisitor) return <span className={pill("none")}>{t("lcStatusEnded")}</span>;
  if (closedAt) return <span className={pill("none")}>{t("lcStatusClosed")}</span>;
  if (lastSender === "VISITOR") return <span className={pill("warn")}>{t("lcStatusWaiting")}</span>;
  return <span className={pill("good")}>{t("lcStatusOpen")}</span>;
}

function useFormat() {
  const { lang } = useLanguage();
  const fa = lang === "fa";
  return {
    fa,
    num: (n: number) => n.toLocaleString(fa ? "fa-IR" : "en-US"),
    dateTime: (iso: string) =>
      new Date(iso).toLocaleString(fa ? "fa-IR" : "en-US", { timeZone: "Asia/Tehran", dateStyle: "medium", timeStyle: "short" }),
    ago: (iso: string) => {
      const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
      const f = (n: number) => n.toLocaleString(fa ? "fa-IR" : "en-US");
      if (fa) return m < 60 ? `${f(m)} دقیقه پیش` : m < 1440 ? `${f(Math.round(m / 60))} ساعت پیش` : `${f(Math.round(m / 1440))} روز پیش`;
      return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
    },
  };
}

/** /admin/live-chat: the site chat's conversations (list + transcript, reply, close). */
export default function AdminLiveChat() {
  const t = useT();
  const { num, ago } = useFormat();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{ configured: boolean; counts: Record<Filter, number>; items: Row[] } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [muted, toggleMuted] = useChimeMuted("admin");

  const loadList = useCallback(() => {
    const sp = new URLSearchParams();
    if (filter !== "all") sp.set("filter", filter);
    if (search) sp.set("q", search);
    fetch(`/api/admin/livechat?${sp}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        setData(d);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, [filter, search]);

  // the list refreshes every 10 s while the tab is visible
  useEffect(() => {
    loadList();
    const timer = setInterval(() => document.visibilityState === "visible" && loadList(), 10_000);
    return () => clearInterval(timer);
  }, [loadList]);

  const list = (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] ${openId ? "max-lg:hidden" : ""}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("lcTitle")} {data && <span className="text-gray-400">({num(data.counts.all)})</span>}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">{data && !data.configured ? t("lcSubtitleOff") : t("lcSubtitleOn")}</p>
        </div>
        <button
          type="button"
          onClick={toggleMuted}
          aria-pressed={muted}
          title={muted ? t("lcChimeOff") : t("lcChimeOn")}
          aria-label={muted ? t("lcChimeOff") : t("lcChimeOn")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 dark:border-gray-700 dark:hover:text-white"
        >
          {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </button>
      </div>
      <form
        className="relative mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
      >
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => setSearch(q.trim())}
          placeholder={t("lcSearch")}
          aria-label={t("lcSearch")}
          className="min-h-10 w-full rounded-xl border border-gray-300 bg-transparent pe-3 ps-9 text-sm outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90"
        />
      </form>
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === f.id ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
          >
            {t(f.label)} {data && <span className="opacity-70">{num(data.counts[f.id] ?? 0)}</span>}
          </button>
        ))}
      </div>
      {loadError && !data ? (
        <p className="text-sm text-rose-500">{t("lcLoadError")}</p>
      ) : !data ? (
        <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-gray-400" />
      ) : data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500 dark:border-gray-800">
          {search || filter !== "all" ? t("lcEmptyFiltered") : t("lcEmpty")}
        </p>
      ) : (
        <ul className="-mx-2 divide-y divide-gray-100 dark:divide-gray-800">
          {data.items.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setOpenId(r.id)}
                aria-current={r.id === openId ? "true" : undefined}
                className={`block w-full rounded-xl px-2 py-3 text-start ${r.id === openId ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"}`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {r.online && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" title={t("lcOnline")} />}
                  <span className="truncate text-sm font-bold text-gray-900 dark:text-white">{r.name || r.contact || t("lcVisitor")}</span>
                  <span className="font-mono text-xs text-gray-400" dir="ltr">
                    #{r.code}
                  </span>
                  <span className="ms-auto shrink-0">
                    <Status closedAt={r.closedAt} endedByVisitor={r.endedByVisitor} lastSender={r.lastSender} />
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-gray-500">{r.lastText ?? "—"}</p>
                <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-gray-400">
                  <span>{ago(r.lastMessageAt)}</span>
                  <span>
                    {num(r.total)} {t("lcMessages")}
                  </span>
                  {r.userId && <span className="text-sky-600 dark:text-sky-300">{t("lcAccount")}</span>}
                  {r.undelivered > 0 && (
                    <span className="text-rose-500">
                      {num(r.undelivered)} {t("lcUndelivered")}
                    </span>
                  )}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {data && data.items.length >= 60 && <p className="mt-3 text-xs text-gray-400">{t("lcShowingLatest")}</p>}
    </div>
  );

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
      <div className="lg:col-span-5">{list}</div>
      <div className="lg:sticky lg:top-24 lg:col-span-7">
        {openId ? (
          <TranscriptPanel key={openId} id={openId} onBack={() => setOpenId(null)} onChanged={loadList} />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center max-lg:hidden dark:border-gray-800">
            <MessageSquareText className="h-6 w-6 text-gray-400" />
            <p className="font-bold text-gray-700 dark:text-gray-200">{t("lcPick")}</p>
            <p className="text-sm text-gray-500">{t("lcPickHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TranscriptPanel({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
  const t = useT();
  const { fa, dateTime } = useFormat();
  const [data, setData] = useState<Transcript | null>(null);
  const [missing, setMissing] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const readFor = useRef("");

  const load = useCallback(() => {
    fetch(`/api/admin/livechat/${id}`, { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) return setMissing(true);
        if (r.ok) setData(await r.json());
      })
      .catch(() => {});
  }, [id]);

  // new visitor messages show up within a few seconds
  useEffect(() => {
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), 4000);
    return () => clearInterval(timer);
  }, [load]);

  // while this transcript is open and the tab visible, the visitor sees ✓✓ on their messages
  const lastVisitorAt = data?.messages.findLast((m) => m.sender === "VISITOR")?.at ?? "";
  useEffect(() => {
    const mark = () => {
      if (document.visibilityState !== "visible" || !lastVisitorAt || lastVisitorAt <= readFor.current) return;
      readFor.current = lastVisitorAt;
      fetch(`/api/admin/livechat/${id}/read`, { method: "POST" }).catch(() => {});
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [id, lastVisitorAt]);

  async function close() {
    setClosing(true);
    try {
      const r = await fetch(`/api/admin/livechat/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "close" }) });
      if (!r.ok) throw new Error();
      load();
      onChanged();
    } catch {
      toastError(t("lcSendError"));
    } finally {
      setClosing(false);
    }
  }

  const card = "rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]";
  const back = (
    <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800 lg:hidden dark:hover:text-white">
      <ChevronLeft className="h-4 w-4 rtl:rotate-180" /> {t("lcBack")}
    </button>
  );
  if (missing)
    return (
      <div className={card}>
        {back}
        <p className="py-8 text-center text-sm text-gray-500">{t("lcNotFound")}</p>
      </div>
    );
  if (!data)
    return (
      <div className={card}>
        <Loader2 className="mx-auto my-10 h-5 w-5 animate-spin text-gray-400" />
      </div>
    );

  const { chat, user, messages } = data;
  const who = chat.name || t("lcVisitor");
  const place = [chat.city, chat.country].filter(Boolean).join("، ");
  const supportName = (m: { author: string | null }) => `${t("lcSupport")}${m.author ? ` (${m.author})` : ""}`;
  const patchMessage = (id: string, patch: Partial<Transcript["messages"][number]>) =>
    setData((d) => d && { ...d, messages: d.messages.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const lightboxItems: LightboxItem[] = messages.flatMap((m) =>
    m.image
      ? [
          {
            id: m.id,
            src: `/api/livechat/file/${m.id}`,
            w: m.image.w,
            h: m.image.h,
            caption: m.text,
            meta: `${m.sender === "VISITOR" ? who : supportName(m)}، ${dateTime(m.at)}`,
            reaction: m.reactions?.support ?? null,
            otherReaction: m.reactions?.visitor ? { who, emoji: m.reactions.visitor } : undefined,
            editable: m.sender === "ADMIN" && !chat.closedAt,
            edited: m.edited,
            comments: messages
              .filter((x) => x.replyTo === m.id)
              .map((x) => ({ id: x.id, who: x.sender === "VISITOR" ? who : supportName(x), text: x.text, time: dateTime(x.at), mine: x.sender === "ADMIN" })),
          },
        ]
      : [],
  );
  const viewIndex = viewing ? lightboxItems.findIndex((x) => x.id === viewing) : -1;
  const commentCount = new Map<string, number>();
  for (const x of messages) if (x.replyTo) commentCount.set(x.replyTo, (commentCount.get(x.replyTo) ?? 0) + 1);
  const post = (url: string, body: object) => fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  /** Support's reaction from the viewer: shown at once, undone if the server says no. */
  async function react(id: string, reaction: Reaction | null) {
    const before = messages.find((x) => x.id === id)?.reactions ?? { visitor: null, support: null };
    patchMessage(id, { reactions: { ...before, support: reaction } });
    try {
      const r = await post("/api/admin/livechat/react", { id, reaction });
      if (!r.ok) throw new Error();
      patchMessage(id, { reactions: ((await r.json()) as { reactions: ImageReactions }).reactions });
    } catch {
      patchMessage(id, { reactions: before });
    }
  }
  async function editCaption(id: string, caption: string): Promise<string | null> {
    try {
      const r = await post("/api/admin/livechat/caption", { id, caption });
      const d = (await r.json().catch(() => ({}))) as { text?: string };
      if (!r.ok || typeof d.text !== "string") return t("lcSendError");
      patchMessage(id, { text: d.text, edited: true });
      return null;
    } catch {
      return t("lcSendError");
    }
  }
  async function comment(imageId: string, text: string): Promise<string | null> {
    try {
      const r = await post(`/api/admin/livechat/${id}`, { text, replyTo: imageId });
      if (!r.ok) return r.status === 409 ? t("lcEndedNote") : t("lcSendError");
      load();
      onChanged();
      return null;
    } catch {
      return t("lcSendError");
    }
  }
  return (
    <div className={card}>
      {back}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            {who}
            <span className="font-mono text-xs text-gray-400" dir="ltr">
              #{chat.code}
            </span>
            {chat.online && <span className={pill("good")}>{t("lcOnline")}</span>}
          </h2>
          <dl className="mt-2 grid gap-1 text-xs text-gray-500">
            {chat.contact && (
              <div className="flex gap-1.5">
                <dt>{t("lcContact")}:</dt>
                <dd className="text-gray-800 dark:text-gray-200" dir="ltr">
                  {chat.contact}
                </dd>
              </div>
            )}
            {user && (
              <div className="flex items-center gap-1.5">
                <dt className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> {t("lcAccount")}:
                </dt>
                <dd className="text-gray-800 dark:text-gray-200">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"} <span dir="ltr">{user.phone}</span> ({user.role.toLowerCase()})
                </dd>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <dt className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {t("lcFrom")}:
              </dt>
              <dd>
                {place || t("lcUnknown")}
                {chat.page && (
                  <>
                    {" — "}
                    {chat.page === "/" ? (
                      t("lcHome")
                    ) : (
                      <bdi className="font-mono" dir="ltr">
                        {chat.page}
                      </bdi>
                    )}
                  </>
                )}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>{t("lcStarted")}:</dt>
              <dd>{dateTime(chat.createdAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Status closedAt={chat.closedAt} endedByVisitor={chat.endedByVisitor} lastSender={messages.findLast((m) => m.sender !== "SYSTEM")?.sender ?? null} />
          {!chat.closedAt && (
            <button
              type="button"
              onClick={close}
              disabled={closing}
              className="flex min-h-9 items-center gap-1.5 rounded-xl border border-gray-300 px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
            >
              {closing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />} {t("lcClose")}
            </button>
          )}
        </div>
      </div>

      {/* column-reverse keeps the view pinned to the newest message */}
      <div className="flex max-h-[60vh] flex-col-reverse overflow-y-auto">
        <ol className="space-y-3 py-4">
          {messages.map((m) =>
            m.sender === "SYSTEM" ? (
              <li key={m.id} className="rounded-xl bg-gray-50 px-3 py-2 text-center text-xs text-gray-500 dark:bg-white/[0.03]">
                {m.text} — {dateTime(m.at)}
              </li>
            ) : (
              <li key={m.id} className={`flex flex-col ${m.sender === "VISITOR" ? "items-start" : "items-end"}`}>
                <span className="mb-1 px-1 text-[11px] font-bold text-gray-400">
                  {m.sender === "VISITOR" ? who : supportName(m)} — {dateTime(m.at)}
                  {m.edited && ` (${t("lcEdited")})`}
                </span>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl ${m.image ? "p-1.5" : "px-3.5 py-2"} text-sm leading-6 ${
                    m.sender === "VISITOR" ? "rounded-ss-md border border-brand-200 bg-brand-50 text-gray-800 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-gray-100" : "rounded-se-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                  }`}
                >
                  {m.replyTo && (
                    <button
                      type="button"
                      onClick={() => messages.some((x) => x.id === m.replyTo && x.image) && setViewing(m.replyTo)}
                      className="-mx-1.5 -mt-0.5 mb-1.5 flex items-center gap-2 rounded-lg bg-black/5 px-1.5 py-1 text-[11px] text-gray-500 dark:bg-white/5 dark:text-gray-400"
                    >
                      {messages.some((x) => x.id === m.replyTo && x.image) ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element -- private, admin-only image */}
                          <img src={`/api/livechat/file/${m.replyTo}`} alt="" className="h-7 w-7 rounded-md object-cover" />
                          {t("lcInReplyTo")}
                        </>
                      ) : (
                        <>📷 {t("lcInReplyToDeleted")}</>
                      )}
                    </button>
                  )}
                  {m.image && (
                    <button type="button" onClick={() => setViewing(m.id)} className="relative block cursor-zoom-in" aria-label={t("lcImage")}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- private, admin-only image */}
                      <img src={`/api/livechat/file/${m.id}`} alt="" width={m.image.w} height={m.image.h} className="h-auto max-h-72 w-auto max-w-full rounded-xl" />
                      <ImageBadges
                        en={!fa}
                        reactions={[
                          ...(m.reactions?.visitor ? [{ who, emoji: m.reactions.visitor }] : []),
                          ...(m.reactions?.support ? [{ who: t("lcSupport"), emoji: m.reactions.support }] : []),
                        ]}
                        comments={commentCount.get(m.id)}
                      />
                    </button>
                  )}
                  {m.text && <span className={m.image ? "block px-2 pt-1.5" : undefined}>{m.text}</span>}
                </div>
                {m.sender === "VISITOR" && !m.delivered && <span className="mt-1 px-1 text-[11px] text-rose-500">{t("lcNotDelivered")}</span>}
                {m.sender === "ADMIN" &&
                  (chat.visitorReadAt && chat.visitorReadAt >= m.at ? (
                    <span className="mt-1 px-1 text-[11px] text-sky-600 dark:text-sky-300">{t("lcRead")}</span>
                  ) : (
                    <span className="mt-1 px-1 text-[11px] text-gray-400">{t("lcUnread")}</span>
                  ))}
              </li>
            ),
          )}
        </ol>
      </div>

      {chat.endedByVisitor ? (
        <p className="border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800">{t("lcEndedNote")}</p>
      ) : (
        <ReplyBox
          chatId={chat.id}
          onSent={() => {
            load();
            onChanged();
          }}
        />
      )}
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
        <Send className="h-3.5 w-3.5 shrink-0" />
        <span>{t("lcTelegramHint").replace("{code}", chat.code)}</span>
      </p>
      {viewIndex >= 0 && (
        <ImageLightbox
          lang={fa ? "fa" : "en"}
          items={lightboxItems}
          index={viewIndex}
          onIndex={(i) => setViewing(lightboxItems[i].id)}
          onClose={() => setViewing(null)}
          onReact={chat.closedAt ? undefined : (it, reaction) => void react(it.id, reaction)}
          onCaption={(it, caption) => editCaption(it.id, caption)}
          onComment={chat.endedByVisitor ? undefined : (it, text) => comment(it.id, text)}
        />
      )}
    </div>
  );
}

/** Reply box under a transcript (Enter sends, Shift+Enter = new line); images go with the typed text as caption. */
function ReplyBox({ chatId, onSent }: { chatId: string; onSent: () => void }) {
  const t = useT();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [upload, setUpload] = useState<{ preview: string; progress: number | null } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingSent = useRef(0);

  const ended = (status: number) => status === 409 && toastError(t("lcEndedNote"));

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/admin/livechat/${chatId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: body }) });
      if (!r.ok) {
        if (!ended(r.status)) toastError(t("lcSendError"));
        return;
      }
      setText("");
      typingSent.current = 0;
      onSent();
    } catch {
      toastError(t("lcSendError"));
    } finally {
      setSending(false);
    }
  }

  async function sendImage(file: File) {
    const problem = chatImageProblem(file);
    if (problem) return toastError(problem);
    const preview = URL.createObjectURL(file);
    const abort = new AbortController();
    abortRef.current = abort;
    setUpload({ preview, progress: null });
    try {
      const form = new FormData();
      form.set("file", await toChatJpeg(file), "image.jpg");
      if (abort.signal.aborted) return;
      form.set("caption", text.trim());
      setUpload({ preview, progress: 0 });
      let shown = 0;
      const res = await uploadWithProgress<{ error: string }>(
        `/api/admin/livechat/${chatId}/upload`,
        form,
        (f) => {
          const pct = Math.floor(f * 100);
          if (pct !== shown) setUpload({ preview, progress: (shown = pct) / 100 });
        },
        abort.signal,
      );
      if (!res.ok) {
        if (!ended(res.status)) toastError(res.data.error ?? t("lcSendError"));
        return;
      }
      setText("");
      onSent();
    } catch (e) {
      if (!abort.signal.aborted) toastError(e instanceof Error && e.message ? e.message : t("lcSendError"));
    } finally {
      abortRef.current = null;
      URL.revokeObjectURL(preview);
      setUpload(null);
    }
  }

  // The visitor's widget shows «پشتیبانی در حال نوشتن…»: at most one ping every 3 s while the text changes.
  const signalTyping = () => {
    const now = Date.now();
    if (now - typingSent.current < 3000) return;
    typingSent.current = now;
    fetch(`/api/admin/livechat/${chatId}/typing`, { method: "POST", keepalive: true }).catch(() => {});
  };

  const progressLabel = !upload ? "" : upload.progress == null ? t("lcPreparing") : upload.progress < 1 ? `${t("lcUploading")} ${Math.round(upload.progress * 100)}%` : t("lcSending");
  return (
    <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
      {upload && (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-2 dark:border-gray-700">
          <div className="relative h-12 w-16 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={upload.preview} alt="" className="h-12 w-16 rounded-xl object-cover" />
            <UploadOverlay progress={upload.progress} small />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-300" aria-live="polite">
            {progressLabel}
          </span>
          {(upload.progress == null || upload.progress < 1) && (
            <button type="button" onClick={() => abortRef.current?.abort()} className="ms-auto min-h-8 rounded-lg px-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10">
              {t("lcCancel")}
            </button>
          )}
        </div>
      )}
      <div className="flex items-end gap-2">
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
          disabled={!!upload || sending}
          aria-label={t("lcImage")}
          title={t("lcImage")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 text-gray-500 hover:text-gray-800 disabled:opacity-40 dark:border-gray-700 dark:hover:text-white"
        >
          {upload ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
        </button>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim()) signalTyping();
          }}
          onPaste={(e) => {
            const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
            if (f) {
              e.preventDefault();
              void sendImage(f);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder={t("lcReplyPlaceholder")}
          aria-label={t("lcReplyPlaceholder")}
          className="max-h-48 min-w-0 flex-1 resize-y rounded-xl border border-gray-300 bg-transparent px-3.5 py-2.5 text-sm leading-6 outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !text.trim()}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />} {t("lcSend")}
        </button>
      </div>
      <div className="space-y-0.5 text-[11px] leading-5 text-gray-400">
        <p>{t("lcImageRule")}</p>
        <p>{t("lcReplyNote")}</p>
      </div>
    </div>
  );
}
