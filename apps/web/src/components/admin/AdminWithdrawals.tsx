"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";

// Withdrawal requests (apps/web lib/withdrawals.ts): the money already left the user's wallet; the
// admin transfers it to the Sheba and marks it paid with the tracking code, or rejects it (refund).

interface Row {
  id: string;
  amountToman: number;
  sheba: string;
  accountHolder: string;
  status: "pending" | "paid" | "rejected" | "cancelled";
  adminNote: string;
  trackingCode: string | null;
  createdAt: string;
  decidedAt: string | null;
  user: { name: string; phone: string | null; role: string };
}

export default function AdminWithdrawals() {
  const t = useT();
  const { num, date, apiError } = useLocaleFormat();
  const [data, setData] = useState<{ pending: Row[]; recent: Row[] } | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/finance/withdrawals").then((r) => r.json()).then(setData).catch(() => setData({ pending: [], recent: [] }));
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  async function act(id: string, body: object) {
    setBusy(id);
    const r = await fetch(`/api/admin/finance/withdrawals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(null);
    if (!r.ok) toast.error(apiError(new Error((await r.json().catch(() => ({}))).error ?? ""), t("saveError")));
    load();
  }

  const money = (n: number) => num(n.toLocaleString("en-US"));
  const statusLabel = { pending: "", paid: t("withdrawalPaid"), rejected: t("withdrawalRejected"), cancelled: t("withdrawalCancelled") };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
      <div>
        {/* the tab above names it (AdminFinanceRequests) */}
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("withdrawalsDesc")}</p>
      </div>
      {!data ? (
        <p className="text-sm text-gray-400">{t("loading")}</p>
      ) : data.pending.length === 0 ? (
        <p className="text-sm text-gray-400">{t("withdrawalsNone")}</p>
      ) : (
        <div className="space-y-3">
          {data.pending.map((w) => (
            <div key={w.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{money(w.amountToman)} IRT</span>
                <span className="text-xs text-gray-500">{w.user.name} · <span dir="ltr">{w.user.phone}</span> · {w.user.role} · {date(w.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span dir="ltr" className="font-mono select-all">{w.sheba}</span> — {w.accountHolder}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  dir="ltr"
                  value={codes[w.id] ?? ""}
                  onChange={(e) => setCodes((c) => ({ ...c, [w.id]: e.target.value }))}
                  placeholder={t("withdrawalTrackingCode")}
                  className="w-56 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <button
                  disabled={busy === w.id || !codes[w.id]?.trim()}
                  onClick={() => act(w.id, { action: "paid", trackingCode: codes[w.id] })}
                  className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
                >
                  {t("withdrawalMarkPaid")}
                </button>
                <button
                  disabled={busy === w.id}
                  onClick={() => {
                    const note = window.prompt(t("withdrawalRejectNote"));
                    if (note !== null) act(w.id, { action: "reject", note });
                  }}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {t("withdrawalReject")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {data && data.recent.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-gray-500">{t("withdrawalsRecent")}</summary>
          <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {data.recent.map((w) => (
              <li key={w.id}>
                {money(w.amountToman)} · {w.user.name} · {statusLabel[w.status]}
                {w.trackingCode && <> · <span dir="ltr">{w.trackingCode}</span></>}
                {w.adminNote && <> · {w.adminNote}</>}
                {w.decidedAt && <> · {date(w.decidedAt)}</>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
