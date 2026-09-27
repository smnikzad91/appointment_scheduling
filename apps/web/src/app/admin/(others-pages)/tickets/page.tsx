"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz, type ColDef } from "ag-grid-community";
import { EyeIcon } from "@/icons";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

type Ticket = {
  id: string;
  subject: string;
  status: "open" | "answered" | "closed";
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  user: { name: string; email: string } | null;
  lastReply: { sender: "user" | "admin" } | null;
};

type GridCtx = { isRTL: boolean; navigate: (id: string) => void; viewLabel: string };
type Filter  = "all" | "open" | "answered" | "closed";

// ── Themes ────────────────────────────────────────────────────────────────────
const agLight = themeQuartz.withParams({
  accentColor:                    "#465fff",
  backgroundColor:                "#ffffff",
  foregroundColor:                "#111827",
  borderColor:                    "#e5e7eb",
  chromeBackgroundColor:          "#f9fafb",
  headerTextColor:                "#6b7280",
  rowHoverColor:                  "#f9fafb",
  columnBorder:                   false,
  rowBorder:                      { color: "#f3f4f6" },
  fontSize:                       14,
  fontFamily:                     "inherit",
  rowVerticalPaddingScale:        1.3,
  headerFontSize:                 12,
});

const agDark = themeQuartz.withParams({
  accentColor:                    "#465fff",
  backgroundColor:                "#111827",
  foregroundColor:                "#f9fafb",
  borderColor:                    "#374151",
  chromeBackgroundColor:          "#111827",
  headerTextColor:                "#9ca3af",
  rowHoverColor:                  "rgba(255,255,255,0.02)",
  columnBorder:                   false,
  rowBorder:                      { color: "#1f2937" },
  fontSize:                       14,
  fontFamily:                     "inherit",
  rowVerticalPaddingScale:        1.3,
  headerFontSize:                 12,
});

// ── Cell Renderers ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  open:     "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  answered: "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400",
  closed:   "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};
const STATUS_LABELS: Record<string, [string, string]> = {
  open:     ["Open", "باز"],
  answered: ["Answered", "پاسخ داده شده"],
  closed:   ["Closed", "بسته"],
};

function StatusCell({ value, context }: { value: string; context: GridCtx }) {
  const label = STATUS_LABELS[value]?.[context.isRTL ? 1 : 0] ?? value;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[value] ?? ""}`}>
      {label}
    </span>
  );
}

function LastReplyCell({ value, context }: { value: Ticket["lastReply"]; context: GridCtx }) {
  if (!value) return <span className="text-xs text-gray-400">{context.isRTL ? "بدون پاسخ" : "No replies"}</span>;
  if (value.sender === "user") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
        {context.isRTL ? "کاربر پیام داد" : "User replied"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      {context.isRTL ? "ادمین پاسخ داد" : "Admin replied"}
    </span>
  );
}

function UserCell({ value }: { value: Ticket["user"] }) {
  if (!value) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-col items-center justify-center leading-tight text-center">
      <span className="text-sm font-medium text-gray-800 dark:text-white">{value.name}</span>
      <span className="text-xs text-gray-400">{value.email}</span>
    </div>
  );
}

function ViewCell({ data, context }: { data: Ticket; context: GridCtx }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  return (
    <>
      <button
        onClick={() => context.navigate(data.id)}
        aria-label={context.viewLabel}
        className="rounded-lg bg-green-500 p-1.5 text-white hover:bg-green-600 transition-colors"
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setTip({ x: r.left + r.width / 2, y: r.bottom + 8 });
        }}
        onMouseLeave={() => setTip(null)}
      >
        <EyeIcon className="w-4 h-4" />
      </button>
      {tip && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", left: tip.x, top: tip.y, transform: "translateX(-50%)", zIndex: 9999, pointerEvents: "none" }}
          className="px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap">
          {context.viewLabel}
        </div>,
        document.body
      )}
    </>
  );
}

function DateCell({ value, context }: { value: string; context: GridCtx }) {
  const formatted = new Date(value).toLocaleDateString(context.isRTL ? "fa-IR" : "en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  return <span dir={context.isRTL ? "rtl" : "ltr"}>{formatted}</span>;
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminTicketsPage() {
  const t        = useT();
  const { lang } = useLanguage();
  const isRTL    = lang === "fa";
  const { theme } = useTheme();
  const router   = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<Filter>("all");

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      fetch("/api/admin/tickets")
        .then((r) => r.json())
        .then((d) => setTickets(Array.isArray(d) ? d : []))
        .catch(() => setTickets([]))
        .finally(() => setLoading(false));
    });
  }, []);

  const counts = useMemo(() => ({
    all:      tickets.length,
    open:     tickets.filter((t) => t.status === "open").length,
    answered: tickets.filter((t) => t.status === "answered").length,
    closed:   tickets.filter((t) => t.status === "closed").length,
  }), [tickets]);

  const filtered = useMemo(
    () => filter === "all" ? tickets : tickets.filter((t) => t.status === filter),
    [tickets, filter],
  );

  const gridContext = useMemo<GridCtx>(() => ({
    isRTL,
    navigate:  (id) => router.push(`/admin/tickets/${id}`),
    viewLabel: t("viewTicket"),
  }), [isRTL, router, t]);

  const colDefs = useMemo<ColDef<Ticket>[]>(() => {
    const cols: ColDef<Ticket>[] = [
    {
      field: "subject",
      headerName: t("ticketSubject"),
      flex: 2,
      minWidth: 160,
      sortable: true,
      filter: false,
    },
    {
      field: "user",
      headerName: t("ticketFrom"),
      flex: 1,
      minWidth: 160,
      sortable: false,
      filter: false,
      cellRenderer: UserCell,
      cellStyle: { display: "flex", alignItems: "center" },
    },
    {
      field: "status",
      headerName: isRTL ? "وضعیت" : "Status",
      width: 140,
      sortable: true,
      filter: false,
      cellRenderer: StatusCell,
    },
    {
      field: "lastReply",
      headerName: isRTL ? "آخرین پیام" : "Last Reply",
      width: 180,
      sortable: false,
      filter: false,
      cellRenderer: LastReplyCell,
    },
    {
      field: "replyCount",
      headerName: t("ticketReplyCount"),
      width: 100,
      sortable: true,
      filter: false,
    },
    {
      field: "createdAt",
      headerName: isRTL ? "تاریخ" : "Date",
      width: 140,
      sortable: true,
      filter: false,
      cellRenderer: DateCell,
    },
    {
      headerName: "",
      width: 90,
      sortable: false,
      filter: false,
      cellRenderer: ViewCell,
      cellStyle: { display: "flex", alignItems: "center" },
    },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [t, isRTL]);

  const tabs: { key: Filter; label: string }[] = [
    { key: "all",      label: t("allTickets") },
    { key: "open",     label: t("filterOpen") },
    { key: "answered", label: t("filterAnswered") },
    { key: "closed",   label: t("filterClosed") },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("adminTicketsTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("adminTicketsDesc")}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-brand-500 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {tab.label}
            <span className={`ms-1.5 rounded-full px-1.5 py-0.5 text-xs ${
              filter === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("noTickets")}</div>
        ) : (
          <div className="ag-ticket-table" dir={isRTL ? "rtl" : "ltr"}>
          <AgGridReact<Ticket>
            rowData={filtered}
            columnDefs={colDefs}
            theme={theme === "dark" ? agDark : agLight}
            domLayout="autoHeight"
            rowHeight={60}
            headerHeight={44}
            getRowId={(p) => p.data.id}
            context={gridContext}
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
