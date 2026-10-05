"use client";

import { useMemo, useState } from "react";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";
import { formatSalonDateTime, DEFAULT_SALON_TIME_ZONE } from "@/lib/salonTime";

// «درخواست‌های افزایش موجودی» on /admin/bank-sms: the latest wallet top-up requests — who, the
// amount asked (toman) and the exact amount to pay (rial, with the identifying 1–1000 rial), status,
// when, and the platform card. A table on desktop, cards on phones; filter by status.

export interface TopUpRow {
  id: string;
  user: { firstName: string; lastName: string; phone: string | null };
  cardNumber: string;
  amountToman: number;
  payableRial: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  creditedToman: number | null;
}

const BADGE: Record<TopUpRow["status"], string> = {
  pending: "bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:ring-warning-500/20",
  paid: "bg-success-50 text-success-700 ring-success-200 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/20",
  expired: "bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700",
  cancelled: "bg-gray-100 text-gray-500 ring-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:ring-gray-700",
};

export default function AdminTopUpsTable({ rows }: { rows: TopUpRow[] | undefined }) {
  const t = useT();
  const { lang, num } = useLocaleFormat();
  const [filter, setFilter] = useState<TopUpRow["status"] | "">("");

  const label: Record<TopUpRow["status"], string> = { pending: t("topUpPending"), paid: t("topUpPaid"), expired: t("topUpExpired"), cancelled: t("topUpCancelled") };
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);
  const shown = (rows ?? []).filter((r) => !filter || r.status === filter);

  const money = (n: number | string) => num(Number(n).toLocaleString("en-US"));
  const when = (iso: string) =>
    lang === "fa" ? formatSalonDateTime(iso) : new Date(iso).toLocaleString("en-US", { timeZone: DEFAULT_SALON_TIME_ZONE, dateStyle: "medium", timeStyle: "short" });
  const toman = lang === "fa" ? "تومان" : "IRT";
  const rialUnit = lang === "fa" ? "ریال" : "rial";
  const userName = (r: TopUpRow) => `${r.user.firstName} ${r.user.lastName}`.trim() || "—";
  const badge = (r: TopUpRow) => (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE[r.status]}`}>{label[r.status]}</span>
  );
  // the time that matters for the status: paid at, else requested at
  const statusTime = (r: TopUpRow) => when(r.paidAt ?? r.createdAt);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">{t("bankSmsTopUps")}</h2>
        <div className="flex flex-wrap gap-1.5">
          {(["", "pending", "paid", "expired", "cancelled"] as const).map((s) => (
            <button
              key={s || "all"}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                filter === s ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {s ? label[s] : t("receivedSmsAll")} {num(s ? counts[s] ?? 0 : rows?.length ?? 0)}
            </button>
          ))}
        </div>
      </div>

      {!rows ? (
        <p className="py-6 text-center text-sm text-gray-400">{t("loading")}</p>
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">{t("topUpNone")}</p>
      ) : (
        <>
          {/* desktop / tablet */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t("topUpColUser")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("topUpColRequested")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("topUpColPayable")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("topUpColStatus")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("topUpColTime")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("topUpColCard")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {shown.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{userName(r)}</p>
                      {r.user.phone && <p dir="ltr" className="text-start text-xs text-gray-500">{num(r.user.phone)}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-900 dark:text-white">
                      {money(r.amountToman)} <span className="text-xs text-gray-500">{toman}</span>
                      {r.status === "paid" && r.creditedToman !== null && r.creditedToman !== r.amountToman && (
                        <p className="text-xs text-success-600">{t("topUpCredited")}: {money(r.creditedToman)}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
                      {money(r.payableRial)} <span className="font-sans text-xs text-gray-500">{rialUnit}</span>
                    </td>
                    <td className="px-4 py-3">{badge(r)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">{statusTime(r)}</td>
                    <td dir="ltr" className="whitespace-nowrap px-4 py-3 text-start font-mono text-xs text-gray-500">•••• {r.cardNumber.slice(-4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* phones */}
          <div className="space-y-2 md:hidden">
            {shown.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900 dark:text-white">{userName(r)}</p>
                    {r.user.phone && <p dir="ltr" className="text-start text-xs text-gray-500">{num(r.user.phone)}</p>}
                  </div>
                  {badge(r)}
                </div>
                <div className="mt-2 flex items-end justify-between gap-2 text-sm">
                  <div>
                    <p className="text-gray-900 dark:text-white">{money(r.amountToman)} <span className="text-xs text-gray-500">{toman}</span></p>
                    <p className="font-mono text-xs text-gray-500">{money(r.payableRial)} {rialUnit}</p>
                  </div>
                  <div className="text-end text-xs text-gray-500">
                    <p>{statusTime(r)}</p>
                    <p dir="ltr" className="font-mono">•••• {r.cardNumber.slice(-4)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
