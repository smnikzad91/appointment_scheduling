"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";
import { useLanguage } from "@/context/LanguageContext";
import { toastError } from "@/lib/toastError";
import Sep from "@/components/common/Sep";
import { FEEDBACK_KIND_LABEL, FEEDBACK_ROLE_LABEL, type FeedbackKind, type FeedbackRole, type FeedbackRow } from "@/lib/feedback";

// /admin/feedback: messages from the public «نظرات و پیشنهادات» form (/feedback), newest first.
// Opening the list doesn't mark anything read — the admin does, per message.

const KIND_STYLE: Record<FeedbackKind, string> = {
  SUGGESTION: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  CRITICISM: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  PRAISE: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
  BUG: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
  OTHER: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function AdminFeedback() {
  const t = useT();
  const { lang } = useLanguage();
  const { date } = useLocaleFormat();
  const [items, setItems] = useState<FeedbackRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await fetch("/api/admin/feedback");
      if (!res.ok) throw new Error(String(res.status));
      setItems((await res.json()).items);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const setRead = async (id: string, read: boolean) => {
    const res = await fetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    }).catch(() => null);
    if (!res?.ok) return toastError(t("fbActionError"));
    setItems((list) => list?.map((f) => (f.id === id ? { ...f, readAt: read ? new Date().toISOString() : null } : f)) ?? null);
  };

  const remove = async (id: string) => {
    if (!confirm(t("fbDeleteConfirm"))) return;
    const res = await fetch(`/api/admin/feedback/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return toastError(t("fbActionError"));
    setItems((list) => list?.filter((f) => f.id !== id) ?? null);
  };

  const unreadCount = items?.filter((f) => !f.readAt).length ?? 0;
  const shown = (items ?? []).filter((f) => !onlyUnread || !f.readAt);
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(lang === "fa" ? "fa-IR" : "en-US", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">{t("fbTitle")}</h1>
        <p className="text-sm text-gray-500">{t("fbSubtitle")}</p>
      </div>

      <div className="flex gap-2">
        {[false, true].map((unread) => (
          <button
            key={String(unread)}
            type="button"
            onClick={() => setOnlyUnread(unread)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              onlyUnread === unread
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {unread ? `${t("fbUnread")} (${lang === "fa" ? unreadCount.toLocaleString("fa-IR") : unreadCount})` : t("fbAll")}
          </button>
        ))}
      </div>

      {failed ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {t("fbLoadError")}{" "}
          <button type="button" onClick={load} className="font-semibold underline">
            {t("fbRetry")}
          </button>
        </div>
      ) : items === null ? (
        <p className="text-sm text-gray-500">{t("fbLoading")}</p>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">{t("fbEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((f) => (
            <li
              key={f.id}
              className={`rounded-2xl border bg-white p-4 dark:bg-white/[0.03] ${
                f.readAt ? "border-gray-200 dark:border-gray-800" : "border-brand-300 dark:border-brand-500/40"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {!f.readAt && <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />}
                <span className={`rounded-full px-2.5 py-0.5 font-semibold ${KIND_STYLE[f.kind] ?? KIND_STYLE.OTHER}`}>
                  {FEEDBACK_KIND_LABEL[f.kind as FeedbackKind]?.[lang] ?? f.kind}
                </span>
                {f.role && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {FEEDBACK_ROLE_LABEL[f.role as FeedbackRole]?.[lang] ?? f.role}
                  </span>
                )}
                <span className="text-gray-400">
                  {date(f.createdAt)} {time(f.createdAt)}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-800 dark:text-gray-200">{f.message}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800">
                <span>
                  {f.name || t("fbAnonymous")}
                  {f.phone && (
                    <>
                      <Sep />
                      <a href={`tel:${f.phone}`} dir="ltr" className="text-brand-500 hover:underline">
                        {f.phone}
                      </a>
                    </>
                  )}
                  {f.userId && (
                    <>
                      <Sep />
                      {t("fbSignedIn")}
                    </>
                  )}
                </span>
                <span className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRead(f.id, !f.readAt)}
                    className="rounded-lg px-2.5 py-1 font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                  >
                    {f.readAt ? t("fbMarkUnread") : t("fbMarkRead")}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    className="rounded-lg px-2.5 py-1 font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    {t("fbDelete")}
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
