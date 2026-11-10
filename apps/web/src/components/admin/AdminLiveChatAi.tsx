"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { toastError } from "@/lib/toastError";
import type { AiCostSummary } from "@/lib/livechat/aiUsage";

type Settings = { aiEnabled: boolean; handoverPhone: string; tomanPerUsd: number | null; configured: boolean };

/**
 * /admin/live-chat «🤖 دستیار هوشمند»: AI answers first or not, who gets the hand-over SMS, and what the
 * AI answers cost (dollars from OpenRouter, toman at the rate entered here).
 */
export function LiveChatAiPanel({ onClose, onOpenChat }: { onClose: () => void; onOpenChat: (id: string) => void }) {
  const t = useT();
  const { lang } = useLanguage();
  const locale = lang === "fa" ? "fa-IR" : "en-US";
  const num = (n: number) => n.toLocaleString(locale);
  const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: n < 1 ? 4 : 2, maximumFractionDigits: n < 1 ? 4 : 2 })}`;

  const [s, setS] = useState<Settings | null>(null);
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [cost, setCost] = useState<AiCostSummary | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/livechat/ai-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Settings) => {
        setS(d);
        setRate(d.tomanPerUsd ? String(d.tomanPerUsd) : "");
      })
      .catch(() => toastError(t("lcLoadError")));
    fetch("/api/admin/livechat/ai-cost", { cache: "no-store" })
      .then((r) => r.json())
      .then(setCost)
      .catch(() => {});
  }, [t]);
  useEffect(load, [load]);

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/livechat/ai-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aiEnabled: s.aiEnabled, handoverPhone: s.handoverPhone, tomanPerUsd: rate.trim() ? Number(rate.replace(/[^\d]/g, "")) : null }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        toastError(t(d.error === "rate" ? "lcAiBadRate" : "lcAiBadPhone"));
        return;
      }
      toast.success(t("lcAiSaved"));
      load();
    } catch {
      toastError(t("lcSendError"));
    } finally {
      setSaving(false);
    }
  }

  const toman = (u: number) => (cost?.tomanPerUsd ? ` · ${num(Math.round(u * cost.tomanPerUsd))} ${t("lcAiToman")}` : "");
  const input = "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-300 dark:border-gray-700 dark:text-white/90";
  const box = "rounded-xl border border-gray-200 p-3 dark:border-gray-800";
  const periods: { key: keyof AiCostSummary["periods"]; label: string }[] = [
    { key: "today", label: t("lcAiToday") },
    { key: "week", label: t("lcAi7d") },
    { key: "month", label: t("lcAi30d") },
    { key: "all", label: t("lcAiAll") },
  ];

  return (
    <Modal isOpen onClose={onClose} className="mx-4 max-w-3xl">
      <div className="flex max-h-[85vh] flex-col gap-5 overflow-y-auto p-6">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">🤖 {t("lcAiTitle")}</h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">{t("lcAiHint")}</p>
        </div>

        {!s ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" />
        ) : (
          <div className="flex flex-col gap-3">
            {!s.configured && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{t("lcAiNotConfigured")}</p>}
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={s.aiEnabled} onChange={(e) => setS({ ...s, aiEnabled: e.target.checked })} className="mt-1 h-4 w-4 accent-brand-500" />
              <span className="leading-6">{t("lcAiEnabled")}</span>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
                {t("lcAiPhone")}
                <input className={input} dir="ltr" inputMode="tel" value={s.handoverPhone} onChange={(e) => setS({ ...s, handoverPhone: e.target.value })} maxLength={20} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-300">
                {t("lcAiRate")}
                <input className={input} dir="ltr" inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="—" maxLength={12} />
              </label>
            </div>
            <p className="text-xs leading-5 text-gray-500">{t("lcAiHandBack")}</p>
            <div>
              <button type="button" onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("lcAiSave")}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t("lcAiCostTitle")}</h4>
          {!cost ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {periods.map(({ key, label }) => {
                  const p = cost.periods[key];
                  return (
                    <div key={key} className={box}>
                      <p className="text-[11px] text-gray-500">{label}</p>
                      <p className="mt-1 text-sm font-bold text-gray-900 dark:text-white" dir="ltr">
                        {usd(p.usd)}
                      </p>
                      {cost.tomanPerUsd ? <p className="text-[11px] text-gray-500">{num(Math.round(p.usd * cost.tomanPerUsd))} {t("lcAiToman")}</p> : null}
                      <p className="mt-1 text-[11px] text-gray-500">
                        {num(p.replies)} {t("lcAiReplies")} · {num(p.chats)} {t("lcAiChats")}
                      </p>
                      {p.replies > 0 && (
                        <p className="text-[11px] text-gray-400" dir="ltr">
                          {usd(p.usd / p.replies)}/{t("lcAiPerReply")}
                        </p>
                      )}
                      {p.untracked + p.pending > 0 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-300">
                          {num(p.untracked + p.pending)} {t("lcAiUnpriced")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {cost.costliest.length > 0 && (
                <div className={box}>
                  <p className="mb-2 text-xs font-bold text-gray-700 dark:text-gray-200">{t("lcAiCostliest")}</p>
                  <ul className="space-y-1 text-xs">
                    {cost.costliest.map((c) => (
                      <li key={c.chatId} className="flex items-center justify-between gap-2">
                        <button type="button" onClick={() => onOpenChat(c.chatId)} className="truncate text-brand-600 hover:underline dark:text-brand-300">
                          #{c.code ?? "—"} {c.name ?? ""}
                        </button>
                        <span className="shrink-0 text-gray-500" dir="ltr">
                          {num(c.replies)} × · {usd(c.usd)}
                          {toman(c.usd)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {cost.models.length > 0 && (
                <div className={box}>
                  <p className="mb-2 text-xs font-bold text-gray-700 dark:text-gray-200">{t("lcAiModels")}</p>
                  <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    {cost.models.map((m) => (
                      <li key={m.model} className="flex justify-between gap-2" dir="ltr">
                        <span className="truncate">{m.model}</span>
                        <span className="shrink-0">
                          {num(m.replies)} · {usd(m.usd)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {cost.recent.length > 0 && (
                <div className={box}>
                  <p className="mb-2 text-xs font-bold text-gray-700 dark:text-gray-200">{t("lcAiRecent")}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-gray-600 dark:text-gray-300">
                      <tbody>
                        {cost.recent.map((r) => (
                          <tr key={r.id} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="py-1 pe-2 whitespace-nowrap">{new Date(r.at).toLocaleString(locale, { timeZone: "Asia/Tehran", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                            <td className="py-1 pe-2">
                              {r.chatId ? (
                                <button type="button" onClick={() => onOpenChat(r.chatId!)} className="text-brand-600 hover:underline dark:text-brand-300">
                                  #{r.code ?? "—"}
                                </button>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="max-w-40 truncate py-1 pe-2" dir="ltr">
                              {r.model}
                            </td>
                            <td className="py-1 pe-2 whitespace-nowrap" dir="ltr">
                              {r.promptTokens ?? "?"}→{r.completionTokens ?? "?"}
                              {r.cachedTokens ? ` (${r.cachedTokens} cached)` : ""}
                            </td>
                            <td className="py-1 whitespace-nowrap" dir="ltr">
                              {r.usd !== null ? usd(r.usd) : r.status === "pending" ? "…" : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {cost.periods.all.replies === 0 && <p className="text-xs text-gray-500">{t("lcAiNoCost")}</p>}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
