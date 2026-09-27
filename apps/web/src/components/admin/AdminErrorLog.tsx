"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { DEFAULT_SALON_TIME_ZONE } from "@/lib/salonTime";
import type { ErrorLogEntry, ErrorSource } from "@/types/content";

type StatusFilter = "open" | "resolved" | "all";
type SourceFilter = ErrorSource | "all";

interface ErrorLogResponse {
  items: ErrorLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  summary: { open: number; last24h: number; openBySource: Record<ErrorSource, number> };
}

const lightTheme = themeQuartz.withParams({
  accentColor: "#465fff", backgroundColor: "#ffffff", foregroundColor: "#111827",
  borderColor: "#e5e7eb", chromeBackgroundColor: "#f9fafb", headerTextColor: "#6b7280",
  rowHoverColor: "#f9fafb", rowBorder: { color: "#f3f4f6" },
});
const darkTheme = themeQuartz.withParams({
  accentColor: "#465fff", backgroundColor: "#111827", foregroundColor: "#f9fafb",
  borderColor: "#374151", chromeBackgroundColor: "#111827", headerTextColor: "#9ca3af",
  rowBorder: { color: "#1f2937" },
});

const SOURCE_STYLE: Record<ErrorSource, string> = {
  api:        "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  web_server: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  web_client: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
};

function formatTime(iso: string, lang: string) {
  // Admins are in Iran — show Tehran time regardless of where the browser thinks it is.
  return new Date(iso).toLocaleString(lang === "fa" ? "fa-IR" : "en-GB", {
    timeZone: DEFAULT_SALON_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "medium",
  });
}

interface GridContext {
  lang: string;
  sourceLabels: Record<ErrorSource, string>;
  labels: { view: string; resolve: string; reopen: string; del: string; resolved: string };
  onView: (row: ErrorLogEntry) => void;
  onToggleResolved: (row: ErrorLogEntry) => void;
  onDelete: (row: ErrorLogEntry) => void;
}

function SourceCell({ value, context }: { value: ErrorSource; context: GridContext }) {
  // AG Grid stretches a cell's direct child to the row height — center the badge in a wrapper.
  return (
    <span className="flex h-full items-center">
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-5 ${SOURCE_STYLE[value]}`}>
        {context.sourceLabels[value]}
      </span>
    </span>
  );
}

function MessageCell({ data, context }: { data: ErrorLogEntry; context: GridContext }) {
  return (
    <span className="flex h-full items-center gap-2">
      {data.resolved && (
        <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:bg-green-500/10 dark:text-green-400">
          {context.labels.resolved}
        </span>
      )}
      <span dir="ltr" className={`line-clamp-1 font-mono text-xs ${data.resolved ? "text-gray-400" : "text-gray-800 dark:text-gray-200"}`}>
        {data.message}
      </span>
    </span>
  );
}

function PathCell({ data }: { data: ErrorLogEntry }) {
  if (!data.path) return <span className="flex h-full items-center text-gray-300 dark:text-gray-600">—</span>;
  return (
    <span className="flex h-full items-center">
      <span dir="ltr" className="line-clamp-1 font-mono text-xs text-gray-500 dark:text-gray-400">
        {data.method ? `${data.method} ` : ""}
        {data.path}
      </span>
    </span>
  );
}

function TimeCell({ value, context }: { value: string; context: GridContext }) {
  return <span className="flex h-full items-center text-xs text-gray-500 dark:text-gray-400">{formatTime(value, context.lang)}</span>;
}

function ActionsCell({ data, context }: { data: ErrorLogEntry; context: GridContext }) {
  const btn = "rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors";
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => context.onView(data)} className={`${btn} text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10`}>
        {context.labels.view}
      </button>
      <button
        type="button"
        onClick={() => context.onToggleResolved(data)}
        className={`${btn} ${data.resolved ? "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" : "text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"}`}
      >
        {data.resolved ? context.labels.reopen : context.labels.resolve}
      </button>
      <button type="button" onClick={() => context.onDelete(data)} className={`${btn} text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10`}>
        {context.labels.del}
      </button>
    </div>
  );
}

export default function AdminErrorLog() {
  const t = useT();
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const isRTL = lang === "fa";

  const [data, setData] = useState<ErrorLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("open");
  const [source, setSource] = useState<SourceFilter>("all");
  const [page, setPage] = useState(1);
  const [viewTarget, setViewTarget] = useState<ErrorLogEntry | null>(null);

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (source !== "all") params.set("source", source);
    return params;
  }, [status, source]);

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filterQuery);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/errors?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [filterQuery, page]);

  useEffect(() => { queueMicrotask(fetchErrors); }, [fetchErrors]);

  async function mutate(url: string, init: RequestInit, successMessage?: string) {
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (successMessage) toast.success(successMessage);
      await fetchErrors();
      return true;
    } catch {
      toast.error(t("errorsActionFailed"));
      return false;
    }
  }

  const handleToggleResolved = async (row: ErrorLogEntry) => {
    const ok = await mutate(`/api/admin/errors/${row.id}`, { method: "PATCH", body: JSON.stringify({ resolved: !row.resolved }) });
    if (ok) setViewTarget((prev) => (prev?.id === row.id ? { ...prev, resolved: !row.resolved } : prev));
  };

  const handleDelete = async (row: ErrorLogEntry) => {
    if (!confirm(t("errorsDeleteConfirm"))) return;
    const ok = await mutate(`/api/admin/errors/${row.id}`, { method: "DELETE" });
    if (ok) setViewTarget((prev) => (prev?.id === row.id ? null : prev));
  };

  const handleResolveAll = async () => {
    if (!confirm(t("errorsResolveAllConfirm"))) return;
    const params = new URLSearchParams();
    if (source !== "all") params.set("source", source);
    await mutate(`/api/admin/errors?${params}`, { method: "PATCH", body: JSON.stringify({ resolved: true }) });
  };

  const handleClearResolved = async () => {
    if (!confirm(t("errorsClearResolvedConfirm"))) return;
    await mutate("/api/admin/errors", { method: "DELETE" });
  };

  const sourceLabels: Record<ErrorSource, string> = {
    api: t("errorsSourceApi"),
    web_server: t("errorsSourceWebServer"),
    web_client: t("errorsSourceWebClient"),
  };

  const context: GridContext = {
    lang,
    sourceLabels,
    labels: { view: t("errorsView"), resolve: t("errorsResolveShort"), reopen: t("errorsReopen"), del: t("errorsDelete"), resolved: t("errorsResolvedBadge") },
    onView: setViewTarget,
    onToggleResolved: handleToggleResolved,
    onDelete: handleDelete,
  };

  const colDefs = useMemo<ColDef<ErrorLogEntry>[]>(() => [
    { field: "createdAt",  headerName: t("errorsColTime"),    width: 170, cellRenderer: TimeCell },
    { field: "source",     headerName: t("errorsColSource"),  width: 120, cellRenderer: SourceCell },
    { field: "message",    headerName: t("errorsColMessage"), flex: 2, minWidth: 260, cellRenderer: MessageCell },
    { field: "path",       headerName: t("errorsColPath"),    flex: 1, minWidth: 180, cellRenderer: PathCell },
    { field: "statusCode", headerName: t("errorsColStatus"),  width: 80 },
    { headerName: t("errorsColActions"), width: 230, sortable: false, cellRenderer: ActionsCell },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [lang]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const pill = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
      active ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
    }`;
  const outlineBtn =
    "rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

  return (
    <section id="errors" dir={isRTL ? "rtl" : "ltr"} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("errorsTitle")}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("errorsSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={fetchErrors} disabled={loading} className={outlineBtn}>{t("errorsRefresh")}</button>
          <button type="button" onClick={handleResolveAll} disabled={!data?.summary.open} className={outlineBtn}>{t("errorsResolveAll")}</button>
          <button type="button" onClick={handleClearResolved} className={`${outlineBtn} text-red-500 dark:text-red-400`}>{t("errorsClearResolved")}</button>
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <SummaryCard label={t("errorsOpen")} value={data.summary.open} lang={lang} highlight={data.summary.open > 0} />
          <SummaryCard label={t("errorsLast24h")} value={data.summary.last24h} lang={lang} />
          {(Object.keys(sourceLabels) as ErrorSource[]).map((s) => (
            <SummaryCard key={s} label={`${sourceLabels[s]} · ${t("errorsOpen")}`} value={data.summary.openBySource[s]} lang={lang} />
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["open", "resolved", "all"] as StatusFilter[]).map((s) => (
          <button key={s} type="button" className={pill(status === s)} onClick={() => { setStatus(s); setPage(1); }}>
            {s === "open" ? t("errorsFilterOpen") : s === "resolved" ? t("errorsFilterResolved") : t("errorsFilterAll")}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />
        {(["all", "api", "web_server", "web_client"] as SourceFilter[]).map((s) => (
          <button key={s} type="button" className={pill(source === s)} onClick={() => { setSource(s); setPage(1); }}>
            {s === "all" ? t("errorsFilterAllSources") : sourceLabels[s]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loadFailed ? (
        <div className="py-16 text-center text-sm text-red-500">{t("errorsLoadFailed")}</div>
      ) : !data ? (
        <div className="py-16 text-center text-sm text-gray-400">{t("errorsLoading")}</div>
      ) : data.items.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">{t("errorsEmpty")}</div>
      ) : (
        <>
          <div className="h-[480px] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
            <AgGridReact
              rowData={data.items}
              columnDefs={colDefs}
              context={context}
              theme={theme === "dark" ? darkTheme : lightTheme}
              rowHeight={48}
              headerHeight={40}
              defaultColDef={{ resizable: true, sortable: false, filter: false }}
              enableRtl={isRTL}
              onRowDoubleClicked={(e) => e.data && setViewTarget(e.data)}
            />
          </div>

          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <button type="button" className={outlineBtn} disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                {t("errorsPrev")}
              </button>
              <span>
                {t("errorsPage")} {page.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")} {t("errorsOf")} {totalPages.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")} · {data.total.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}
              </span>
              <button type="button" className={outlineBtn} disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                {t("errorsNext")}
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {viewTarget && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={() => setViewTarget(null)}>
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t("errorsView")}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${SOURCE_STYLE[viewTarget.source]}`}>
                {sourceLabels[viewTarget.source]}
              </span>
              {viewTarget.resolved && (
                <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-600 dark:bg-green-500/10 dark:text-green-400">
                  {t("errorsResolvedBadge")}
                </span>
              )}
              <span className="text-xs text-gray-400">{formatTime(viewTarget.createdAt, lang)}</span>
            </div>

            <p dir="ltr" className="break-words font-mono text-sm font-semibold text-gray-900 dark:text-white">{viewTarget.message}</p>

            <dl className="mt-4 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-[auto_1fr]">
              {viewTarget.path && (
                <Meta label={t("errorsColPath")} value={`${viewTarget.method ?? ""} ${viewTarget.path}`.trim()} />
              )}
              {viewTarget.statusCode !== null && <Meta label={t("errorsColStatus")} value={String(viewTarget.statusCode)} />}
              {viewTarget.userId && <Meta label={t("errorsUser")} value={viewTarget.userId} />}
              {viewTarget.userAgent && <Meta label={t("errorsUserAgent")} value={viewTarget.userAgent} />}
            </dl>

            {viewTarget.stack && (
              <div className="mt-4">
                <h3 className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t("errorsStack")}</h3>
                <pre dir="ltr" className="max-h-72 overflow-auto rounded-xl bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                  {viewTarget.stack}
                </pre>
              </div>
            )}

            {viewTarget.context && Object.values(viewTarget.context).some((v) => v !== undefined && v !== null) && (
              <div className="mt-4">
                <h3 className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t("errorsContext")}</h3>
                <pre dir="ltr" className="max-h-48 overflow-auto rounded-xl bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                  {JSON.stringify(viewTarget.context, null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleResolved(viewTarget)}
                  className={viewTarget.resolved ? outlineBtn : "rounded-xl bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"}
                >
                  {viewTarget.resolved ? t("errorsReopen") : t("errorsResolve")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(viewTarget)}
                  className="rounded-xl bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                >
                  {t("errorsDelete")}
                </button>
              </div>
              <button type="button" onClick={() => setViewTarget(null)} className={outlineBtn}>
                {t("errorsClose")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryCard({ label, value, lang, highlight }: { label: string; value: number; lang: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10" : "border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40"}`}>
      <p className={`text-xl font-bold ${highlight ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
        {value.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-semibold text-gray-500 dark:text-gray-400">{label}</dt>
      <dd dir="ltr" className="break-all font-mono text-gray-700 dark:text-gray-300">{value}</dd>
    </>
  );
}
