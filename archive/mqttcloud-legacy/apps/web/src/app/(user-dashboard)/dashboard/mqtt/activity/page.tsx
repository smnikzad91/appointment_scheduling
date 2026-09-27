"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz, type ColDef } from "ag-grid-community";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useMqttLive, type MqttActivityEvent } from "@/context/MqttLiveContext";
import DateRangeFilter from "@/components/user-dashboard/DateRangeFilter";

function MqttSubNav() {
  const t        = useT();
  const pathname = usePathname();
  const tabs = [
    { href: "/dashboard/mqtt",          label: t("linkOverview") },
    { href: "/dashboard/mqtt/activity", label: t("mqttTabActivity") },
    { href: "/dashboard/mqtt/messages", label: t("mqttTabMessages") },
  ];
  return (
    <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
      {tabs.map((tb) => {
        const active = pathname === tb.href;
        return (
          <Link
            key={tb.href}
            href={tb.href}
            className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tb.label}
          </Link>
        );
      })}
    </div>
  );
}

type Activity = {
  id: string;
  clientName: string;
  event: "connect" | "disconnect";
  createdAt: string;
};

// ── AG Grid Themes ─────────────────────────────────────────────────────────────
const agLight = themeQuartz.withParams({
  accentColor: "#465fff", backgroundColor: "#ffffff", foregroundColor: "#111827",
  borderColor: "#e5e7eb", chromeBackgroundColor: "#f9fafb", headerTextColor: "#6b7280",
  rowHoverColor: "#f9fafb", columnBorder: false, rowBorder: { color: "#f3f4f6" },
  fontSize: 14, fontFamily: "inherit", rowVerticalPaddingScale: 1.3, headerFontSize: 12,
});
const agDark = themeQuartz.withParams({
  accentColor: "#465fff", backgroundColor: "#111827", foregroundColor: "#f9fafb",
  borderColor: "#374151", chromeBackgroundColor: "#111827", headerTextColor: "#9ca3af",
  rowHoverColor: "rgba(255,255,255,0.02)", columnBorder: false, rowBorder: { color: "#1f2937" },
  fontSize: 14, fontFamily: "inherit", rowVerticalPaddingScale: 1.3, headerFontSize: 12,
});

function MonoCell({ value }: { value: string }) {
  return <span dir="ltr" className="font-mono text-sm text-gray-800 dark:text-gray-200">{value}</span>;
}

function EventCell({ value, context }: { value: "connect" | "disconnect"; context: { connectLabel: string; disconnectLabel: string } }) {
  const connect = value === "connect";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      connect ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
    }`}>
      {connect ? context.connectLabel : context.disconnectLabel}
    </span>
  );
}

function DateTimeCell({ value, context }: { value: string | null; context: { isRTL: boolean; neverLabel: string } }) {
  if (!value) return <span className="text-gray-400">{context.neverLabel}</span>;
  const formatted = new Date(value).toLocaleString(context.isRTL ? "fa-IR" : "en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return <span dir="ltr" className="text-xs text-gray-500 dark:text-gray-400">{formatted}</span>;
}

export default function UserMqttActivityPage() {
  const t         = useT();
  const { lang }  = useLanguage();
  const isRTL     = lang === "fa";
  const { theme } = useTheme();

  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading]   = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      fetch("/api/user/mqtt/activity")
        .then((r) => r.json())
        .then((a) => setActivity(Array.isArray(a) ? a : []))
        .finally(() => setLoading(false));
    });
  }, []);

  // Prepend connect/disconnect events the moment they happen instead of
  // waiting for a refetch.
  const onLiveEvent = useCallback((e: MqttActivityEvent) => {
    setActivity((prev) => [e, ...prev]);
  }, []);
  useMqttLive(onLiveEvent);

  const activityCols = useMemo<ColDef<Activity>[]>(() => {
    const cols: ColDef<Activity>[] = [
      { field: "clientName", headerName: t("mqttClientName"), flex: 1, minWidth: 140, sortable: true, filter: false, cellRenderer: MonoCell },
      { field: "event",      headerName: isRTL ? "رویداد" : "Event", width: 140, sortable: true, filter: false, cellRenderer: EventCell },
      { field: "createdAt",  headerName: isRTL ? "زمان" : "Time", width: 170, sortable: true, filter: false, cellRenderer: DateTimeCell },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [isRTL, t]);

  const activityCtx = useMemo(() => ({
    isRTL, neverLabel: t("mqttNeverSeen"),
    connectLabel: t("eventConnect"), disconnectLabel: t("eventDisconnect"),
  }), [isRTL, t]);

  const filteredActivity = useMemo(() => {
    if (!dateFrom && !dateTo) return activity;
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : -Infinity;
    const toTime   = dateTo   ? new Date(`${dateTo}T23:59:59.999`).getTime() : Infinity;
    return activity.filter((a) => {
      const time = new Date(a.createdAt).getTime();
      return time >= fromTime && time <= toTime;
    });
  }, [activity, dateFrom, dateTo]);


  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("mqttActivity")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("mqttActivityDesc")}</p>
      </div>

      <MqttSubNav />

      <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("loading")}</div>
        ) : activity.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("noMqttActivity")}</div>
        ) : filteredActivity.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("noResultsInRange")}</div>
        ) : (
          <div className="ag-ticket-table" dir={isRTL ? "rtl" : "ltr"}>
            <AgGridReact<Activity>
              rowData={filteredActivity}
              columnDefs={activityCols}
              theme={theme === "dark" ? agDark : agLight}
              domLayout="autoHeight"
              rowHeight={52}
              headerHeight={44}
              getRowId={(p) => p.data.id}
              context={activityCtx}
              suppressMovableColumns
              suppressCellFocus
              suppressRowClickSelection
              suppressHorizontalScroll
            />
          </div>
        )}
      </div>
    </div>
  );
}
