"use client";

import { useEffect, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { listAdminAppointments, type AdminAppointment, type AdminAppointmentStatus, type AdminAppointmentsPage } from "@/lib/api/adminAppointments";
import { Modal } from "@/components/ui/modal";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";
import type { TranslationKey } from "@/i18n/translations";
import { addDaysToDateKey, formatSalonDateTime, salonWallTimeToInstant, toSalonWallTime, DEFAULT_SALON_TIME_ZONE } from "@/lib/salonTime";
import { placeLabel } from "@/lib/independent";
import { formatMinutesAsClock } from "@/lib/persian";

// /admin/appointments: every booking on the platform — status tabs with counts, a period, a search
// over customer (name/phone), salon and stylist, 50 a page; a row opens the full details.

const STATUSES: AdminAppointmentStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"];
const STATUS_KEY: Record<AdminAppointmentStatus, TranslationKey> = {
  PENDING: "aptPending",
  CONFIRMED: "aptConfirmed",
  COMPLETED: "aptCompleted",
  CANCELLED: "aptCancelled",
  NO_SHOW: "aptNoShow",
};
const STATUS_BADGE: Record<AdminAppointmentStatus, string> = {
  PENDING: "bg-warning-50 text-warning-700 ring-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:ring-warning-500/20",
  CONFIRMED: "bg-blue-light-50 text-blue-light-700 ring-blue-light-200 dark:bg-blue-light-500/10 dark:text-blue-light-400 dark:ring-blue-light-500/20",
  COMPLETED: "bg-success-50 text-success-700 ring-success-200 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/20",
  CANCELLED: "bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700",
  NO_SHOW: "bg-error-50 text-error-700 ring-error-200 dark:bg-error-500/10 dark:text-error-400 dark:ring-error-500/20",
};

type Period = "all" | "today" | "next7" | "past30";

/** [from, to) in Tehran wall-clock days. */
function periodRange(period: Period): { from?: string; to?: string } {
  if (period === "all") return {};
  const today = toSalonWallTime(new Date()).dateKey;
  const at = (key: string) => salonWallTimeToInstant(key, 0).toISOString();
  if (period === "today") return { from: at(today), to: at(addDaysToDateKey(today, 1)) };
  if (period === "next7") return { from: at(today), to: at(addDaysToDateKey(today, 7)) };
  return { from: at(addDaysToDateKey(today, -30)), to: at(addDaysToDateKey(today, 1)) };
}

export default function AdminAppointments() {
  const t = useT();
  const { lang, num } = useLocaleFormat();
  const token = useApiAccessToken();
  const [status, setStatus] = useState<AdminAppointmentStatus | "">("");
  const [period, setPeriod] = useState<Period>("all");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminAppointmentsPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<AdminAppointment | null>(null);

  useEffect(() => {
    const id = setTimeout(() => { setQuery(q.trim()); setPage(1); }, 400);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listAdminAppointments(token, { status: status || undefined, q: query || undefined, page, ...periodRange(period) })
      .then((d) => { if (!cancelled) { setData(d); setFailed(false); } })
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [token, status, query, period, page]);

  const money = (n: number) => num(n.toLocaleString("en-US"));
  const toman = lang === "fa" ? "تومان" : "IRT";
  const when = (iso: string, tz = DEFAULT_SALON_TIME_ZONE) =>
    lang === "fa" ? formatSalonDateTime(iso, tz) : new Date(iso).toLocaleString("en-US", { timeZone: tz, dateStyle: "medium", timeStyle: "short" });
  const endClock = (a: AdminAppointment) =>
    lang === "fa"
      ? formatMinutesAsClock(toSalonWallTime(a.endAt, a.salon.timezone).minuteOfDay)
      : new Date(a.endAt).toLocaleTimeString("en-US", { timeZone: a.salon.timezone, timeStyle: "short" });
  const customerName = (a: AdminAppointment) => `${a.customer.firstName} ${a.customer.lastName}`.trim() || "—";
  const badge = (s: AdminAppointmentStatus) => (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE[s]}`}>{t(STATUS_KEY[s])}</span>
  );
  const prepayLabel = (a: AdminAppointment) =>
    !a.prepaidToman ? "—" : `${money(a.prepaidToman)} · ${t(a.prepaymentStatus === "SETTLED" ? "aptPrepaySettled" : a.prepaymentStatus === "REFUNDED" ? "aptPrepayRefunded" : "aptPrepayHeld")}`;
  const allCount = data ? Object.values(data.counts).reduce((s, n) => s + (n ?? 0), 0) : 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const chip = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("aptTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("aptDesc")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setStatus(""); setPage(1); }} className={chip(status === "")}>{t("aptAll")} {data && num(allCount)}</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={chip(status === s)}>
            {t(STATUS_KEY[s])} {data && num(data.counts[s] ?? 0)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "today", "next7", "past30"] as const).map((p) => (
          <button key={p} onClick={() => { setPeriod(p); setPage(1); }} className={chip(period === p)}>
            {t(p === "all" ? "aptPeriodAll" : p === "today" ? "aptPeriodToday" : p === "next7" ? "aptPeriodNext7" : "aptPeriodPast30")}
          </button>
        ))}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("aptSearch")}
          aria-label={t("aptSearch")}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:ms-auto sm:w-80"
        />
      </div>

      {failed && <p className="text-sm text-red-500">{t("overviewLoadFailed")}</p>}
      {!data ? (
        <p className="py-10 text-center text-sm text-gray-400">{t("loading")}</p>
      ) : data.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">{t("aptNone")}</p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] lg:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  {(["aptColTime", "aptColSalon", "aptColStylist", "aptColCustomer", "aptColServices", "aptColPrice", "aptColPrepaid", "aptColStatus"] as const).map((k) => (
                    <th key={k} className="px-4 py-3 text-start font-medium">{t(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.items.map((a) => (
                  <tr key={a.id} onClick={() => setOpen(a)} className="cursor-pointer hover:bg-gray-50/70 dark:hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-900 dark:text-white">{when(a.startAt, a.salon.timezone)}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{a.salon.name}</p>
                      {a.salon.kind === "INDEPENDENT" && <p className="text-xs text-gray-500">{t("aptIndependent")}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.stylist.displayName}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900 dark:text-white">{customerName(a)}</p>
                      {a.customer.phone && <p dir="ltr" className="text-start text-xs text-gray-500">{num(a.customer.phone)}</p>}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-gray-700 dark:text-gray-300">{a.services.map((s) => s.name).join("، ")}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-900 dark:text-white">{money(a.priceToman)} <span className="text-xs text-gray-500">{toman}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{prepayLabel(a)}</td>
                    <td className="px-4 py-3">{badge(a.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 lg:hidden">
            {data.items.map((a) => (
              <button key={a.id} onClick={() => setOpen(a)} className="block w-full rounded-xl border border-gray-200 bg-white p-3 text-start dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{when(a.startAt, a.salon.timezone)}</p>
                    <p className="truncate text-sm text-gray-600 dark:text-gray-300">{a.salon.name} · {a.stylist.displayName}</p>
                  </div>
                  {badge(a.status)}
                </div>
                <div className="mt-1.5 flex items-end justify-between gap-2 text-sm">
                  <p className="min-w-0 truncate text-gray-700 dark:text-gray-300">{customerName(a)}</p>
                  <p className="whitespace-nowrap text-gray-900 dark:text-white">{money(a.priceToman)} <span className="text-xs text-gray-500">{toman}</span></p>
                </div>
              </button>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300">{t("aptNewer")}</button>
              <span className="text-gray-500">{num(page)} / {num(pages)}</span>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300">{t("aptOlder")}</button>
            </div>
          )}
        </>
      )}

      <Modal isOpen={!!open} onClose={() => setOpen(null)} className="mx-4 w-full max-w-lg">
        {open && (
          <div className="max-h-[85vh] space-y-4 overflow-y-auto p-6" dir={lang === "fa" ? "rtl" : "ltr"}>
            <div className="flex items-start justify-between gap-3 pe-8">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("aptDetails")}</h2>
                <p className="text-sm text-gray-500">{when(open.startAt, open.salon.timezone)}</p>
              </div>
              {badge(open.status)}
            </div>

            <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm dark:divide-gray-800 dark:border-gray-800">
              <Row label={t("aptColSalon")}>
                <a href={`/s/${open.salon.slug}`} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">{open.salon.name}</a>
                {open.salon.kind === "INDEPENDENT" && <span className="ms-2 text-xs text-gray-500">{t("aptIndependent")}</span>}
              </Row>
              <Row label={t("aptColStylist")}>{open.stylist.displayName}</Row>
              <Row label={t("aptColCustomer")}>
                {customerName(open)}
                {open.customer.phone && <span dir="ltr" className="ms-2 text-gray-500">{num(open.customer.phone)}</span>}
              </Row>
              {open.serviceLocation && <Row label={t("aptPlace")}>{lang === "fa" ? placeLabel(open.serviceLocation, open.salon.hostSalonName) : open.serviceLocation}</Row>}
              {open.visitAddress && <Row label={t("aptVisitAddress")}>{open.visitAddress}</Row>}
              <Row label={t("aptDuration")}>{when(open.startAt, open.salon.timezone)} – {endClock(open)}</Row>
              <Row label={t("aptCreatedAt")}>{when(open.createdAt, open.salon.timezone)}</Row>
              {open.notes && <Row label={t("aptNotes")}>{open.notes}</Row>}
            </dl>

            <div className="rounded-xl border border-gray-200 text-sm dark:border-gray-800">
              <p className="border-b border-gray-100 px-4 py-2 text-xs font-medium text-gray-500 dark:border-gray-800">{t("aptColServices")}</p>
              {open.services.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2">
                  <span className="text-gray-900 dark:text-white">{s.name} <span className="text-xs text-gray-500">({num(s.durationMinutes)}′)</span></span>
                  <span className="whitespace-nowrap text-gray-700 dark:text-gray-300">{money(s.priceToman)} {toman}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 font-semibold dark:border-gray-800">
                <span>{t("aptTotal")}</span>
                <span>{money(open.priceToman)} {toman}</span>
              </div>
            </div>

            <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm dark:divide-gray-800 dark:border-gray-800">
              <Row label={t("aptColPrepaid")}>{prepayLabel(open)}</Row>
              {open.prepaymentStylistToman > 0 && <Row label={t("aptPrepayStylistPart")}>{money(open.prepaymentStylistToman)} {toman}</Row>}
              {open.balanceMethod && (
                <Row label={t("aptBalance")}>
                  {open.balanceMethod === "ON_SITE"
                    ? t("aptBalanceOnSite")
                    : `${money(open.balanceDueToman)} ${toman}، ${t(open.balancePaidAt ? "aptBalancePaid" : "aptBalanceWaiting")}`}
                </Row>
              )}
              {open.chargedToman !== null && <Row label={t("aptCharged")}>{money(open.chargedToman)} {toman}</Row>}
              {!!open.tipToman && <Row label={t("aptTip")}>{money(open.tipToman)} {toman}</Row>}
              {open.stylistShareToman !== null && <Row label={t("aptStylistShare")}>{money(open.stylistShareToman)} {toman}</Row>}
              {open.reviews.length > 0 && (
                <Row label={t("aptReviews")}>
                  {open.reviews.map((r) => `${r.target === "SALON" ? t("aptColSalon") : t("aptColStylist")}${r.rating ? ` ${num(r.rating)}★` : ""}`).join("، ")}
                </Row>
              )}
            </dl>
            <p dir="ltr" className="text-start font-mono text-[11px] text-gray-400">{open.id}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-end text-gray-900 dark:text-white">{children}</dd>
    </div>
  );
}
