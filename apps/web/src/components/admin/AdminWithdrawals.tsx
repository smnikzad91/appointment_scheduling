"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";
import type { TranslationKey } from "@/i18n/translations";
import { formatSalonDateTime, DEFAULT_SALON_TIME_ZONE } from "@/lib/salonTime";

// «درخواست‌های برداشت» tab of /admin/finance (lib/withdrawals.ts): the money already left the
// user's wallet; the admin transfers it to the Sheba and marks it paid with the bank's tracking code,
// or rejects it (the amount goes back to the wallet). Table on desktop, cards on phones.

type Status = "pending" | "paid" | "rejected" | "cancelled";
interface Row {
  id: string;
  amountToman: number;
  sheba: string;
  accountHolder: string;
  status: Status;
  adminNote: string;
  trackingCode: string | null;
  createdAt: string;
  decidedAt: string | null;
  user: { name: string; phone: string | null; role: string };
}

const BADGE: Record<Status, string> = {
  pending: "bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:ring-warning-500/20",
  paid: "bg-success-50 text-success-700 ring-success-200 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/20",
  rejected: "bg-error-50 text-error-700 ring-error-200 dark:bg-error-500/10 dark:text-error-400 dark:ring-error-500/20",
  cancelled: "bg-gray-100 text-gray-500 ring-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:ring-gray-700",
};
const STATUS_KEY: Record<Status, TranslationKey> = {
  pending: "withdrawalPending",
  paid: "withdrawalPaid",
  rejected: "withdrawalRejected",
  cancelled: "withdrawalCancelled",
};
const ROLE_KEY: Record<string, TranslationKey> = {
  customer: "roleCustomer",
  salon_owner: "roleSalonOwner",
  stylist: "roleStylist",
  independent_stylist: "roleIndependentStylist",
  platform_admin: "rolePlatformAdmin",
};

export default function AdminWithdrawals() {
  const t = useT();
  const { lang, num, apiError } = useLocaleFormat();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<Status | "">("pending");
  const [action, setAction] = useState<{ row: Row; kind: "paid" | "reject" } | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/finance/withdrawals").then((r) => r.json()).then((d) => setRows(d.items ?? [])).catch(() => setRows([]));
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);
  const shown = (rows ?? []).filter((r) => !filter || r.status === filter);

  const money = (n: number) => num(n.toLocaleString("en-US"));
  const toman = lang === "fa" ? "تومان" : "IRT";
  const when = (iso: string) =>
    lang === "fa" ? formatSalonDateTime(iso) : new Date(iso).toLocaleString("en-US", { timeZone: DEFAULT_SALON_TIME_ZONE, dateStyle: "medium", timeStyle: "short" });
  const sheba = (s: string) => s.replace(/(.{4})/g, "$1 ").trim();
  const roleLabel = (role: string) => (ROLE_KEY[role] ? t(ROLE_KEY[role]) : role);
  const badge = (s: Status) => (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE[s]}`}>{t(STATUS_KEY[s])}</span>
  );
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      // clipboard blocked: the value is selectable anyway
    }
  };

  async function submitAction() {
    if (!action) return;
    setBusy(true);
    const body = action.kind === "paid" ? { action: "paid", trackingCode: input.trim() } : { action: "reject", note: input.trim() };
    const r = await fetch(`/api/admin/finance/withdrawals/${action.row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) {
      toast.error(apiError(new Error((await r.json().catch(() => ({}))).error ?? ""), t("saveError")));
      return;
    }
    toast.success(action.kind === "paid" ? t("withdrawalPaid") : t("withdrawalRejected"));
    setAction(null);
    load();
  }

  const actions = (r: Row) =>
    r.status === "pending" ? (
      <div className="flex gap-1.5">
        <button onClick={() => { setAction({ row: r, kind: "paid" }); setInput(""); }} className="whitespace-nowrap rounded-lg bg-success-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-success-600">
          {t("withdrawalMarkPaid")}
        </button>
        <button onClick={() => { setAction({ row: r, kind: "reject" }); setInput(""); }} className="whitespace-nowrap rounded-lg border border-error-200 px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:border-error-500/30 dark:hover:bg-error-500/10">
          {t("withdrawalReject")}
        </button>
      </div>
    ) : (
      <div className="text-xs text-gray-500">
        {r.decidedAt && <p>{when(r.decidedAt)}</p>}
        {r.trackingCode && <p dir="ltr" className="text-start font-mono">{r.trackingCode}</p>}
        {r.adminNote && <p>{r.adminNote}</p>}
      </div>
    );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      {/* the tab above names it (AdminFinanceRequests) */}
      <div className="mb-4 flex flex-col gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("withdrawalsDesc")}</p>
        <div className="flex flex-wrap gap-1.5">
          {(["pending", "paid", "rejected", "cancelled", ""] as const).map((s) => (
            <button
              key={s || "all"}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                filter === s ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {s ? t(STATUS_KEY[s]) : t("receivedSmsAll")} {num(s ? counts[s] ?? 0 : rows?.length ?? 0)}
            </button>
          ))}
        </div>
      </div>

      {!rows ? (
        <p className="py-6 text-center text-sm text-gray-400">{t("loading")}</p>
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">{filter === "pending" ? t("withdrawalsNone") : t("withdrawalsEmpty")}</p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  {(["topUpColUser", "withdrawalColAmount", "withdrawalColSheba", "topUpColStatus", "withdrawalColRequested", "withdrawalColResult"] as const).map((k) => (
                    <th key={k} className="px-4 py-3 text-start font-medium">{t(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {shown.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{r.user.name || "—"}</p>
                      <p className="text-xs text-gray-500">
                        {r.user.phone && <span dir="ltr">{num(r.user.phone)}</span>} · {roleLabel(r.user.role)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {money(r.amountToman)} <span className="text-xs font-normal text-gray-500">{toman}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => copy(r.sheba)} title={t("copyCardNumber")} dir="ltr" className="font-mono text-xs text-gray-800 hover:text-brand-500 dark:text-gray-200">
                        {sheba(r.sheba)}
                      </button>
                      <p className="text-xs text-gray-500">{r.accountHolder}</p>
                    </td>
                    <td className="px-4 py-3">{badge(r.status)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{when(r.createdAt)}</td>
                    <td className="px-4 py-3">{actions(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {shown.map((r) => (
              <div key={r.id} className="space-y-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900 dark:text-white">{r.user.name || "—"}</p>
                    <p className="text-xs text-gray-500">{r.user.phone && <span dir="ltr">{num(r.user.phone)}</span>} · {roleLabel(r.user.role)}</p>
                  </div>
                  {badge(r.status)}
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{money(r.amountToman)} <span className="text-xs font-normal text-gray-500">{toman}</span></p>
                <div>
                  <button type="button" onClick={() => copy(r.sheba)} dir="ltr" className="font-mono text-xs text-gray-800 dark:text-gray-200">{sheba(r.sheba)}</button>
                  <p className="text-xs text-gray-500">{r.accountHolder} · {when(r.createdAt)}</p>
                </div>
                {actions(r)}
              </div>
            ))}
          </div>
        </>
      )}

      <Modal isOpen={!!action} onClose={() => !busy && setAction(null)} className="mx-4 w-full max-w-md">
        {action && (
          <div className="space-y-4 p-6" dir={lang === "fa" ? "rtl" : "ltr"}>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {action.kind === "paid" ? t("withdrawalMarkPaid") : t("withdrawalReject")}
            </h2>
            <div className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800">
              <p className="font-medium text-gray-900 dark:text-white">{money(action.row.amountToman)} {toman} · {action.row.user.name}</p>
              <p dir="ltr" className="mt-1 text-start font-mono text-xs text-gray-600 dark:text-gray-300">{sheba(action.row.sheba)}</p>
              <p className="text-xs text-gray-500">{action.row.accountHolder}</p>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {action.kind === "paid" ? t("withdrawalTrackingCode") : t("withdrawalRejectNote")}
              </span>
              {action.kind === "paid" ? (
                <input dir="ltr" autoFocus value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
              ) : (
                <textarea rows={3} autoFocus value={input} onChange={(e) => setInput(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
              )}
            </label>
            <div className="flex gap-3">
              <button
                onClick={submitAction}
                disabled={busy || (action.kind === "paid" && !input.trim())}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${action.kind === "paid" ? "bg-success-500 hover:bg-success-600" : "bg-error-500 hover:bg-error-600"}`}
              >
                {busy ? t("submitting") : action.kind === "paid" ? t("withdrawalMarkPaid") : t("withdrawalReject")}
              </button>
              <button onClick={() => setAction(null)} disabled={busy} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
                {t("cancel")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
