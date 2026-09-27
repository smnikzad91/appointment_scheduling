"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz, type ColDef } from "ag-grid-community";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

type Owner = { name: string; email: string } | null;

type Credential = {
  id: string;
  username: string;
  isActive: boolean;
  maxConnection: number;
  createdAt: string;
  user: Owner;
};

type Client = {
  id: string;
  clientName: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  username: string;
  user: Owner;
};

type Activity = {
  id: string;
  clientName: string;
  event: "connect" | "disconnect";
  createdAt: string;
  user: Owner;
};

type Tab = "credentials" | "clients" | "activity";

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

function UserCell({ value }: { value: Owner }) {
  if (!value) return <span className="text-gray-400">—</span>;
  return (
    <div dir="ltr" className="flex flex-col justify-center leading-tight">
      <span className="text-sm font-medium text-gray-800 dark:text-white">{value.name}</span>
      <span className="text-xs text-gray-400">{value.email}</span>
    </div>
  );
}

function DateCell({ value, context }: { value: string | null; context: { isRTL: boolean } }) {
  if (!value) return <span className="text-gray-400">—</span>;
  const formatted = new Date(value).toLocaleDateString(context.isRTL ? "fa-IR" : "en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  return <span dir="ltr">{formatted}</span>;
}

function UsernameCell({ value }: { value: string }) {
  return <span dir="ltr" className="font-mono text-sm text-gray-800 dark:text-gray-200">{value}</span>;
}

function OnlineCell({ value, context }: { value: boolean; context: { onlineLabel: string; offlineLabel: string } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      value ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${value ? "bg-green-500" : "bg-gray-400"}`} />
      {value ? context.onlineLabel : context.offlineLabel}
    </span>
  );
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

type CredActionCtx = {
  suspendLabel: string;
  unsuspendLabel: string;
  deleteLabel: string;
  onToggle: (c: Credential) => void;
  onDelete: (id: string) => void;
};

function CredActionCell({ data, context }: { data: Credential; context: CredActionCtx }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => context.onToggle(data)}
        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
          data.isActive
            ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-500/10 dark:text-yellow-400"
            : "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400"
        }`}
      >
        {data.isActive ? context.suspendLabel : context.unsuspendLabel}
      </button>
      <button
        onClick={() => context.onDelete(data.id)}
        className="rounded-lg bg-red-400 hover:bg-red-500 p-1.5 text-white transition-colors"
        aria-label={context.deleteLabel}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  );
}

export default function AdminMqttPage() {
  const t         = useT();
  const { lang }  = useLanguage();
  const isRTL     = lang === "fa";
  const { theme } = useTheme();

  const [tab, setTab]                 = useState<Tab>("credentials");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [clients, setClients]         = useState<Client[]>([]);
  const [activity, setActivity]       = useState<Activity[]>([]);
  const [loading, setLoading]         = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/mqtt/credentials").then((r) => r.json()),
      fetch("/api/admin/mqtt/clients").then((r) => r.json()),
      fetch("/api/admin/mqtt/activity").then((r) => r.json()),
    ])
      .then(([c, cl, a]) => {
        setCredentials(Array.isArray(c) ? c : []);
        setClients(Array.isArray(cl) ? cl : []);
        setActivity(Array.isArray(a) ? a : []);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { queueMicrotask(load); }, []);

  const handleToggle = async (c: Credential) => {
    const res = await fetch(`/api/admin/mqtt/credentials/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    if (res.ok) { toast.success(c.isActive ? t("mqttCredentialSuspended") : t("mqttCredentialUnsuspended")); load(); }
    else        { const d = await res.json(); toast.error(d.error || t("saveError")); }
  };

  const handleDelete = async (id: string) => {
    const res  = await fetch(`/api/admin/mqtt/credentials/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) { toast.success(t("mqttCredentialDeleted")); load(); }
    else        { toast.error(data.error || t("saveError")); }
  };

  const credCols = useMemo<ColDef<Credential>[]>(() => {
    const cols: ColDef<Credential>[] = [
      { field: "user",          headerName: isRTL ? "کاربر" : "User",     flex: 1.4, minWidth: 160, sortable: false, filter: false, cellRenderer: UserCell, valueFormatter: () => "" },
      { field: "username",      headerName: t("mqttUsername"),           flex: 1, minWidth: 140, sortable: true, filter: false, cellRenderer: UsernameCell },
      { field: "isActive",      headerName: isRTL ? "وضعیت" : "Status",  width: 120, sortable: true, filter: false,
        cellRenderer: ({ value }: { value: boolean }) => (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${value ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
            {value ? t("mqttActive") : t("mqttSuspended")}
          </span>
        ) },
      { field: "maxConnection", headerName: t("mqttMaxConnection"),       width: 130, sortable: true, filter: false },
      { field: "createdAt",     headerName: isRTL ? "تاریخ" : "Date",     width: 130, sortable: true, filter: false, cellRenderer: DateCell },
      { headerName: "",         width: 160, sortable: false, filter: false, cellRenderer: CredActionCell },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [isRTL, t]);

  const clientCols = useMemo<ColDef<Client>[]>(() => {
    const cols: ColDef<Client>[] = [
      { field: "user",        headerName: isRTL ? "کاربر" : "User",       flex: 1.3, minWidth: 160, sortable: false, filter: false, cellRenderer: UserCell, valueFormatter: () => "" },
      { field: "clientName",  headerName: t("mqttClientName"),            flex: 1, minWidth: 140, sortable: true, filter: false, cellRenderer: UsernameCell },
      { field: "username",    headerName: t("mqttUsername"),              flex: 1, minWidth: 120, sortable: true, filter: false, cellRenderer: UsernameCell },
      { field: "isOnline",    headerName: isRTL ? "اتصال" : "Status",     width: 130, sortable: true, filter: false, cellRenderer: OnlineCell },
      { field: "lastSeenAt",  headerName: t("mqttLastSeen"),              width: 140, sortable: true, filter: false, cellRenderer: DateCell },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [isRTL, t]);

  const activityCols = useMemo<ColDef<Activity>[]>(() => {
    const cols: ColDef<Activity>[] = [
      { field: "user",        headerName: isRTL ? "کاربر" : "User",       flex: 1.3, minWidth: 160, sortable: false, filter: false, cellRenderer: UserCell, valueFormatter: () => "" },
      { field: "clientName",  headerName: t("mqttClientName"),            flex: 1, minWidth: 140, sortable: true, filter: false, cellRenderer: UsernameCell },
      { field: "event",       headerName: isRTL ? "رویداد" : "Event",     width: 130, sortable: true, filter: false, cellRenderer: EventCell },
      { field: "createdAt",   headerName: isRTL ? "زمان" : "Time",        width: 160, sortable: true, filter: false, cellRenderer: DateCell },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [isRTL, t]);

  const credContext = useMemo<CredActionCtx & { isRTL: boolean }>(() => ({
    isRTL,
    suspendLabel: t("suspend"), unsuspendLabel: t("unsuspend"), deleteLabel: t("delete"),
    onToggle: handleToggle, onDelete: handleDelete,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isRTL, t]);

  const statusCtx = useMemo(() => ({ isRTL, onlineLabel: t("mqttOnline"), offlineLabel: t("mqttOffline") }), [isRTL, t]);
  const eventCtx   = useMemo(() => ({ isRTL, connectLabel: t("eventConnect"), disconnectLabel: t("eventDisconnect") }), [isRTL, t]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "credentials", label: t("mqttTabCredentials"), count: credentials.length },
    { key: "clients",     label: t("mqttTabClients"),     count: clients.length },
    { key: "activity",    label: t("mqttTabActivity"),    count: activity.length },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("adminMqttTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("adminMqttDesc")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === tb.key
                ? "bg-brand-500 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {tb.label}
            <span className={`ms-1.5 rounded-full px-1.5 py-0.5 text-xs ${
              tab === tb.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}>
              {tb.count}
            </span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("loading")}</div>
        ) : (
          <div className="ag-ticket-table" dir={isRTL ? "rtl" : "ltr"}>
            {tab === "credentials" && (
              credentials.length === 0
                ? <div className="p-10 text-center text-sm text-gray-400">{t("noMqttCredentials")}</div>
                : <AgGridReact<Credential>
                    rowData={credentials}
                    columnDefs={credCols}
                    theme={theme === "dark" ? agDark : agLight}
                    domLayout="autoHeight"
                    rowHeight={56}
                    headerHeight={44}
                    getRowId={(p) => p.data.id}
                    context={credContext}
                    suppressMovableColumns
                    suppressCellFocus
                    suppressRowClickSelection
                    suppressHorizontalScroll
                  />
            )}
            {tab === "clients" && (
              clients.length === 0
                ? <div className="p-10 text-center text-sm text-gray-400">{t("noMqttClients")}</div>
                : <AgGridReact<Client>
                    rowData={clients}
                    columnDefs={clientCols}
                    theme={theme === "dark" ? agDark : agLight}
                    domLayout="autoHeight"
                    rowHeight={56}
                    headerHeight={44}
                    getRowId={(p) => p.data.id}
                    context={statusCtx}
                    suppressMovableColumns
                    suppressCellFocus
                    suppressRowClickSelection
                    suppressHorizontalScroll
                  />
            )}
            {tab === "activity" && (
              activity.length === 0
                ? <div className="p-10 text-center text-sm text-gray-400">{t("noMqttActivity")}</div>
                : <AgGridReact<Activity>
                    rowData={activity}
                    columnDefs={activityCols}
                    theme={theme === "dark" ? agDark : agLight}
                    domLayout="autoHeight"
                    rowHeight={52}
                    headerHeight={44}
                    getRowId={(p) => p.data.id}
                    context={eventCtx}
                    suppressMovableColumns
                    suppressCellFocus
                    suppressRowClickSelection
                    suppressHorizontalScroll
                  />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
