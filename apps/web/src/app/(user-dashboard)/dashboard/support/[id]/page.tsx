"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";

type Reply = { _id: string; sender: "user" | "admin"; message: string; images?: string[]; createdAt: string };
type Ticket = {
  _id: string;
  subject: string;
  message: string;
  images?: string[];
  status: "open" | "answered" | "closed";
  replies: Reply[];
  createdAt: string;
};

const STATUS_COLORS = {
  open:     "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  answered: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
  closed:   "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

export default function TicketDetailPage() {
  const t   = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket]   = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply]       = useState("");
  const [images, setImages]     = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending]   = useState(false);
  const [closing, setClosing]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (images.length + files.length > 5) { alert(isRTL ? "حداکثر ۵ تصویر" : "Max 5 images"); return; }
    setUploading(true);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setImages((prev) => [...prev, data.url]);
    }
    setUploading(false);
  }, [images.length, isRTL]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/user/tickets/${id}`)
      .then((r) => r.json())
      .then((d) => setTicket(d._id ? d : null))
      .catch(() => setTicket(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { queueMicrotask(load); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [ticket]);

  const handleClose = async () => {
    setClosing(true);
    const res = await fetch(`/api/user/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" }),
    });
    setClosing(false);
    if (res.ok) { toast.success(t("ticketClosed")); load(); }
    else toast.error(t("saveError"));
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const res  = await fetch(`/api/user/tickets/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply, images }),
    });
    const data = await res.json();
    setSending(false);

    if (res.ok) {
      toast.success(t("replySent"));
      setReply("");
      setImages([]);
      load();
    } else {
      toast.error(data.error || t("saveError"));
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(isRTL ? "fa-IR" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        {t("loading")}
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/support" className="text-sm text-brand-500 hover:underline">
          ← {t("backToTickets")}
        </Link>
        <p className="text-sm text-gray-500">{t("notFound")}</p>
      </div>
    );
  }

  const isClosed = ticket.status === "closed";

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Back link */}
      <Link href="/dashboard/support" className="inline-flex items-center gap-1 text-sm text-brand-500 hover:underline">
        {isRTL ? "→" : "←"} {t("backToTickets")}
      </Link>

      {/* Ticket header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">{ticket.subject}</h1>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
              {t(`status${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}` as "statusOpen")}
            </span>
            {!isClosed && (
              <button
                onClick={handleClose}
                disabled={closing}
                className="rounded-lg border border-error-200 px-3 py-1 text-xs font-medium text-error-600 hover:bg-error-50 dark:border-error-700 dark:text-error-400 dark:hover:bg-error-500/10 transition-colors disabled:opacity-50"
              >
                {closing ? "..." : t("closeTicket")}
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-400">{formatDate(ticket.createdAt)}</p>
      </div>

      {/* Conversation */}
      <div className="rounded-2xl border border-gray-200 bg-white pt-4 pb-4 pl-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="ticket-scroll space-y-3 max-h-[520px] overflow-y-scroll pr-3">
        {/* Initial message */}
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-gray-100 dark:bg-gray-800 px-4 py-3">
            <p className="text-sm text-gray-800 dark:text-white whitespace-pre-wrap">{ticket.message}</p>
            {ticket.images && ticket.images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {ticket.images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block h-24 w-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 hover:opacity-90 transition-opacity">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-400">{formatDate(ticket.createdAt)}</p>
          </div>
        </div>

        {/* Replies */}
        {ticket.replies.map((r) => (
          <div
            key={r._id}
            className={`flex ${r.sender === "admin" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                r.sender === "admin"
                  ? "rounded-tr-sm bg-brand-500"
                  : "rounded-tl-sm bg-gray-100 dark:bg-gray-800"
              }`}
            >
              {r.sender === "admin" && (
                <p className="mb-1 text-xs font-semibold text-white/80">{t("adminReply")}</p>
              )}
              <p className={`text-sm whitespace-pre-wrap ${r.sender === "admin" ? "text-white" : "text-gray-800 dark:text-white"}`}>
                {r.message}
              </p>
              {r.images && r.images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block h-24 w-24 rounded-lg overflow-hidden border border-white/20 hover:opacity-90 transition-opacity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              <p className={`mt-1 text-xs ${r.sender === "admin" ? "text-white/60" : "text-gray-400"}`}>
                {formatDate(r.createdAt)}
              </p>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
      </div>

      {/* Reply form */}
      {isClosed ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          {t("ticketClosed")}
        </div>
      ) : (
        <form onSubmit={handleReply} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("yourReply")}
          </label>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t("replyPlaceholder")}
            rows={4}
            required
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 resize-none"
          />
          {/* Image picker */}
          <div className="mt-3">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || images.length >= 5}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              )}
              {isRTL ? `پیوست تصویر (${images.length}/5)` : `Attach images (${images.length}/5)`}
            </button>
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative group h-16 w-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3">
            <button
              type="submit"
              disabled={sending || uploading}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {sending ? t("sending") : t("sendReply")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
