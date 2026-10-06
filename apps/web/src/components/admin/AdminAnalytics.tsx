"use client";

import { useEffect, useMemo, useState } from "react";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";
import type { TranslationKey } from "@/i18n/translations";
import type { AnalyticsSummary } from "@/lib/analytics/summary";
import { addDaysToDateKey, formatSalonDateTime, salonWallTimeToInstant, toSalonWallTime, DEFAULT_SALON_TIME_ZONE } from "@/lib/salonTime";

// /admin/analytics («بازدیدها»): public-site page views (lib/analytics), booking events on salon
// pages and APK downloads for a window of Tehran days — KPIs, a daily chart, breakdowns, the log.

type Range = "today" | "7d" | "30d" | "90d";
const RANGE_DAYS: Record<Range, number> = { today: 1, "7d": 7, "30d": 30, "90d": 90 };
const RANGE_KEY: Record<Range, TranslationKey> = { today: "anRangeToday", "7d": "anRange7", "30d": "anRange30", "90d": "anRange90" };

function windowOf(range: Range) {
  const today = toSalonWallTime(new Date()).dateKey;
  const firstDay = addDaysToDateKey(today, 1 - RANGE_DAYS[range]);
  return {
    from: salonWallTimeToInstant(firstDay, 0).toISOString(),
    to: salonWallTimeToInstant(addDaysToDateKey(today, 1), 0).toISOString(),
    days: Array.from({ length: RANGE_DAYS[range] }, (_, i) => addDaysToDateKey(firstDay, i)),
  };
}

interface LogRow {
  id: string;
  kind: "VIEW" | "BOOKING_OPEN" | "BOOKING_DONE" | "DOWNLOAD";
  path: string;
  referrerType: string;
  referrerSource: string | null;
  browser: string;
  os: string;
  device: string;
  country: string;
  city: string;
  createdAt: string;
  visitor: string;
}

export default function AdminAnalytics() {
  const t = useT();
  const { lang, num } = useLocaleFormat();
  const [range, setRange] = useState<Range>("30d");
  const win = useMemo(() => windowOf(range), [range]);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/analytics?from=${win.from}&to=${win.to}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && (setData(d), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [win]);

  const n = (v: number) => num(v.toLocaleString("en-US"));
  const pct = (a: number, b: number) => (b > 0 ? `${num(((a / b) * 100).toFixed(a / b < 0.1 ? 1 : 0))}٪` : "—");
  const label = (k: string) => {
    const known: Record<string, TranslationKey> = {
      direct: "anRefDirect", internal: "anRefInternal", search: "anRefSearch", social: "anRefSocial", external: "anRefExternal",
      desktop: "anDesktop", mobile: "anMobile", tablet: "anTablet", Unknown: "anUnknown", "/": "anHome",
    };
    return known[k] ? t(known[k]) : k;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("anTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("anDesc")}</p>
        </div>
        <div className="flex gap-1.5">
          {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${range === r ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"}`}
            >
              {t(RANGE_KEY[r])}
            </button>
          ))}
        </div>
      </div>

      {failed && <p className="text-sm text-red-500">{t("overviewLoadFailed")}</p>}
      {!data ? (
        <p className="py-10 text-center text-sm text-gray-400">{t("loading")}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label={t("anViews")} value={n(data.totals.views)} />
            <Kpi label={t("anVisitors")} value={n(data.totals.visitors)} />
            <Kpi label={t("anBookingOpened")} value={n(data.booking.opened)} hint={`${n(data.booking.openedVisitors)} ${t("anPeople")}`} />
            <Kpi label={t("anBookingDone")} value={n(data.booking.done)} hint={`${n(data.booking.doneVisitors)} ${t("anPeople")}`} />
            <Kpi label={t("anConversion")} value={pct(data.booking.doneVisitors, data.booking.openedVisitors)} hint={t("anConversionHint")} />
            <Kpi label={t("anDownloads")} value={n(data.downloads.website + data.downloads.app)} hint={`${t("anDlSite")} ${n(data.downloads.website)}، ${t("anDlApp")} ${n(data.downloads.app)}`} />
          </div>

          <DailyChart days={win.days} perDay={data.perDay} n={n} viewsLabel={t("anViews")} visitorsLabel={t("anVisitors")} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title={t("anTopPages")} rows={data.pages.map((r) => ({ ...r, label: label(r.key) }))} n={n} ltr />
            <Breakdown title={t("anTopSalons")} rows={data.salons.map((r) => ({ ...r, label: r.name }))} n={n} />
            <Breakdown title={t("anReferrers")} rows={data.referrers.map((r) => ({ ...r, label: label(r.key) }))} n={n} />
            <Breakdown title={t("anDevices")} rows={data.devices.map((r) => ({ ...r, label: label(r.key) }))} n={n} />
            <Breakdown title={t("anBrowsers")} rows={data.browsers.map((r) => ({ ...r, label: label(r.key) }))} n={n} />
            <Breakdown title={t("anOs")} rows={data.oses.map((r) => ({ ...r, label: label(r.key) }))} n={n} />
            <Breakdown title={t("anCountries")} rows={data.countries.map((r) => ({ ...r, label: label(r.key) }))} n={n} />
            <Breakdown title={t("anCities")} rows={data.cities.map((r) => ({ ...r, label: label(r.key) }))} n={n} />
          </div>

          <VisitLog from={win.from} to={win.to} lang={lang} />
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

/** Views per day as bars, unique visitors as the darker inner bar; every day of the window, empty ones too. */
function DailyChart({ days, perDay, n, viewsLabel, visitorsLabel }: {
  days: string[]; perDay: AnalyticsSummary["perDay"]; n: (v: number) => string; viewsLabel: string; visitorsLabel: string;
}) {
  const byDay = new Map(perDay.map((d) => [d.day, d]));
  const max = Math.max(1, ...perDay.map((d) => d.views));
  const W = 1000;
  const H = 180;
  const bw = W / days.length;
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-2 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-200 dark:bg-brand-500/40" />{viewsLabel}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />{visitorsLabel}</span>
      </div>
      <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="h-48 w-full" preserveAspectRatio="none" role="img" aria-label={viewsLabel}>
        {days.map((day, i) => {
          const d = byDay.get(day);
          const vh = d ? (d.views / max) * H : 0;
          const uh = d ? (d.visitors / max) * H : 0;
          const x = i * bw;
          return (
            <g key={day}>
              <title>{`${day}: ${n(d?.views ?? 0)} / ${n(d?.visitors ?? 0)}`}</title>
              <rect x={x + bw * 0.12} y={H - vh} width={bw * 0.76} height={Math.max(vh, d ? 1 : 0)} className="fill-brand-200 dark:fill-brand-500/40" rx={2} />
              <rect x={x + bw * 0.3} y={H - uh} width={bw * 0.4} height={uh} className="fill-brand-500" rx={2} />
            </g>
          );
        })}
        <line x1={0} y1={H} x2={W} y2={H} className="stroke-gray-200 dark:stroke-gray-700" />
      </svg>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-gray-400" dir="ltr">
        <span>{days[0]}</span>
        <span>{days[days.length - 1]}</span>
      </div>
    </section>
  );
}

function Breakdown({ title, rows, n, ltr }: { title: string; rows: { key: string; label: string; views: number; visitors: number }[]; n: (v: number) => string; ltr?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.views));
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">—</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span dir={ltr ? "ltr" : undefined} className="min-w-0 truncate text-gray-700 dark:text-gray-300">{r.label}</span>
                <span className="shrink-0 text-gray-900 dark:text-white">
                  {n(r.views)} <span className="text-xs text-gray-400">({n(r.visitors)})</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full bg-brand-400" style={{ width: `${(r.views / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function VisitLog({ from, to, lang }: { from: string; to: string; lang: string }) {
  const t = useT();
  const { num } = useLocaleFormat();
  const [kind, setKind] = useState("");
  const [path, setPath] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [data, setData] = useState<{ total: number; items: LogRow[] } | null>(null);

  useEffect(() => {
    const id = setTimeout(() => { setQuery(path.trim()); setPage(1); }, 400);
    return () => clearTimeout(id);
  }, [path]);

  useEffect(() => {
    const params = new URLSearchParams({ from, to, page: String(page), pageSize: String(pageSize) });
    if (kind) params.set("kind", kind);
    if (query) params.set("path", query);
    let cancelled = false;
    fetch(`/api/admin/analytics/visits?${params}`).then((r) => r.json()).then((d) => !cancelled && setData(d)).catch(() => {});
    return () => { cancelled = true; };
  }, [from, to, kind, query, page, pageSize]);

  const kindLabel: Record<LogRow["kind"], string> = { VIEW: t("anKindView"), BOOKING_OPEN: t("anBookingOpened"), BOOKING_DONE: t("anBookingDone"), DOWNLOAD: t("anKindDownload") };
  const when = (iso: string) =>
    lang === "fa" ? formatSalonDateTime(iso) : new Date(iso).toLocaleString("en-US", { timeZone: DEFAULT_SALON_TIME_ZONE, dateStyle: "short", timeStyle: "short" });
  const pages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const input = "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="me-auto text-sm font-semibold text-gray-900 dark:text-white">
          {t("anLog")} {data && <span className="font-normal text-gray-400">({num(data.total.toLocaleString("en-US"))})</span>}
        </h2>
        <select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }} className={input}>
          <option value="">{t("receivedSmsAll")}</option>
          {(Object.keys(kindLabel) as LogRow["kind"][]).map((k) => <option key={k} value={k}>{kindLabel[k]}</option>)}
        </select>
        <input value={path} onChange={(e) => setPath(e.target.value)} placeholder={t("anPathFilter")} dir="ltr" className={`${input} w-44`} />
        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className={input}>
          {[25, 50, 100, 200].map((s) => <option key={s} value={s}>{num(s)}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              {(["anColTime", "anColKind", "anColPage", "anColFrom", "anColDevice", "anColPlace", "anColVisitor"] as const).map((k) => (
                <th key={k} className="whitespace-nowrap px-3 py-2.5 text-start font-medium">{t(k)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {data?.items.map((v) => (
              <tr key={v.id}>
                <td className="whitespace-nowrap px-3 py-2 text-gray-500">{when(v.createdAt)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-300">{kindLabel[v.kind]}</td>
                <td dir="ltr" className="max-w-[220px] truncate px-3 py-2 text-start font-mono text-xs text-gray-800 dark:text-gray-200">{v.path}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">{v.referrerSource ?? v.referrerType}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">{v.browser} · {v.os} · {v.device}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">{v.country}{v.city !== "Unknown" ? ` · ${v.city}` : ""}</td>
                <td dir="ltr" className="px-3 py-2 text-start font-mono text-xs text-gray-400">{v.visitor}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.items.length === 0 && <p className="py-6 text-center text-sm text-gray-400">{t("anNoVisits")}</p>}
      </div>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300">{t("aptNewer")}</button>
          <span className="text-gray-500">{num(page)} / {num(pages)}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300">{t("aptOlder")}</button>
        </div>
      )}
    </section>
  );
}
