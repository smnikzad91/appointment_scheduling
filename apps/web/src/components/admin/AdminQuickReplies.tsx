"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Plus, Trash2, Zap } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useT } from "@/i18n/useT";
import type { TranslationKey } from "@/i18n/translations";
import { toastError } from "@/lib/toastError";

export type QuickReply = { id: string; key: string; title: string; text: string; keywords: string[]; autoReply: boolean; order: number };

/** The saved answers, loaded once per panel and refreshed after edits. */
export function useQuickReplies() {
  const [list, setList] = useState<QuickReply[] | null>(null);
  const reload = () =>
    fetch("/api/admin/livechat/quick-replies", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setList)
      .catch(() => setList([]));
  useEffect(() => {
    void reload();
    // the manager saved a change: every open reply box picks it up
    const again = () => void reload();
    window.addEventListener("livechat:quick-replies", again);
    return () => window.removeEventListener("livechat:quick-replies", again);
  }, []);
  return { list, reload };
}

/** «⚡» in the reply box: pick a saved answer to put into the text. */
export function QuickReplyPicker({ list, onPick, disabled }: { list: QuickReply[] | null; onPick: (text: string) => void; disabled?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const shown = (list ?? []).filter((r) => !q.trim() || `${r.title} ${r.key} ${r.text}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label={t("lcQrInsert")}
        title={t("lcQrInsert")}
        aria-expanded={open}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 text-gray-500 hover:text-gray-800 disabled:opacity-40 dark:border-gray-700 dark:hover:text-white"
      >
        <Zap className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute bottom-full start-0 z-20 mb-2 w-80 max-w-[80vw] rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("lcQuickReplies")}
            className="mb-2 h-9 w-full rounded-lg border border-gray-200 bg-transparent px-3 text-sm outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90"
          />
          <ul className="max-h-64 overflow-y-auto">
            {!list ? (
              <Loader2 className="mx-auto my-4 h-4 w-4 animate-spin text-gray-400" />
            ) : shown.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-gray-500">{t("lcQrEmpty")}</li>
            ) : (
              shown.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(r.text);
                      setOpen(false);
                    }}
                    className="block w-full rounded-lg px-2.5 py-2 text-start hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-gray-100">
                      {r.title}
                      <span className="font-mono text-[11px] font-normal text-gray-400" dir="ltr">
                        /r {r.key}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-gray-500">{r.text}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const EMPTY = { key: "", title: "", text: "", keywords: "", autoReply: false, order: 0 };

/** «پاسخ‌های آماده»: add, edit and delete the saved answers (and which go out automatically on keywords). */
export function QuickRepliesManager({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const { list, reload } = useQuickReplies();
  const [editing, setEditing] = useState<{ id: string | null; key: string; title: string; text: string; keywords: string; autoReply: boolean; order: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      const body = JSON.stringify({ ...editing, keywords: editing.keywords });
      const r = await fetch(editing.id ? `/api/admin/livechat/quick-replies/${editing.id}` : "/api/admin/livechat/quick-replies", {
        method: editing.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        toastError(t((d.error as TranslationKey) ?? "lcSendError") || t("lcSendError"));
        return;
      }
      setEditing(null);
      await reload();
      onChanged();
    } catch {
      toastError(t("lcSendError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/livechat/quick-replies/${id}`, { method: "DELETE" });
      setEditing(null);
      await reload();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90";
  return (
    <Modal isOpen onClose={onClose} className="mx-4 max-w-2xl">
      <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{t("lcQuickReplies")}</h3>
            <p className="mt-1 text-xs text-gray-500">{t("lcQrHint")}</p>
          </div>
          {!editing && (
            <button type="button" onClick={() => setEditing({ id: null, ...EMPTY, order: (list?.length ?? 0) + 1 })} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600">
              <Plus className="h-4 w-4" /> {t("lcQrNew")}
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
                {t("lcQrKey")}
                <input className={input} dir="ltr" value={editing.key} onChange={(e) => setEditing({ ...editing, key: e.target.value.toLowerCase() })} maxLength={30} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600 sm:col-span-2 dark:text-gray-300">
                {t("lcQrTitle")}
                <input className={input} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={60} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
              {t("lcQrText")}
              <textarea className={`${input} min-h-32 leading-6`} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} maxLength={1500} />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
              {t("lcQrKeywords")}
              <input className={input} value={editing.keywords} onChange={(e) => setEditing({ ...editing, keywords: e.target.value })} />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={editing.autoReply} onChange={(e) => setEditing({ ...editing, autoReply: e.target.checked })} className="accent-brand-500" />
                {t("lcQrAuto")}
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                {t("lcQrOrder")}
                <input className={`${input} w-20`} dir="ltr" inputMode="numeric" value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
              </label>
            </div>
            <div className="flex items-center justify-between gap-2">
              {editing.id ? (
                <button type="button" disabled={busy} onClick={() => remove(editing.id!)} className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900 dark:hover:bg-rose-500/10">
                  <Trash2 className="h-4 w-4" /> {t("lcQrDelete")}
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)} disabled={busy} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
                  {t("lcCancel")}
                </button>
                <button type="button" onClick={save} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t("lcQrSave")}
                </button>
              </div>
            </div>
          </div>
        ) : !list ? (
          <Loader2 className="mx-auto my-6 h-5 w-5 animate-spin text-gray-400" />
        ) : list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500 dark:border-gray-800">{t("lcQrEmpty")}</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {list.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ id: r.id, key: r.key, title: r.title, text: r.text, keywords: r.keywords.join("، "), autoReply: r.autoReply, order: r.order })}
                  className="block w-full px-1 py-3 text-start hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                >
                  <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                    {r.title}
                    <span className="font-mono text-xs font-normal text-gray-400" dir="ltr">
                      /r {r.key}
                    </span>
                    {r.autoReply && (
                      <span className="flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                        <Bot className="h-3 w-3" /> {t("lcQrAutoBadge")}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs text-gray-500">{r.text}</span>
                  {r.keywords.length > 0 && <span className="mt-1 block text-[11px] text-gray-400">{r.keywords.join("، ")}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
