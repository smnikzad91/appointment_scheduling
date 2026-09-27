"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

type ContactStatus = "new" | "read" | "replied";

interface ContactRow {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactStatus;
  createdAt: string;
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

function StatusBadge({ status, labels }: { status: ContactStatus; labels: Record<string, string> }) {
  const cfg: Record<ContactStatus, string> = {
    new:     "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    read:    "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    replied: "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400",
  };
  const dot: Record<ContactStatus, string> = {
    new: "bg-blue-500", read: "bg-gray-400", replied: "bg-green-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {labels[status]}
    </span>
  );
}

function IconBtn({ label, color, children, onClick }: { label: string; color: string; children: React.ReactNode; onClick: () => void }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  return (
    <button type="button" className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${color}`}
      onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setTip(null)}
      onClick={onClick} aria-label={label}>
      {children}
      {tip && (
        <div className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-8 rounded px-2 py-1 text-xs text-white bg-gray-800 whitespace-nowrap"
          style={{ left: tip.x, top: tip.y }}>{label}</div>
      )}
    </button>
  );
}

function ActionsCell({ data, context }: {
  data: ContactRow;
  context: { labels: { view: string; del: string }; onView: (r: ContactRow) => void; onDelete: (id: string) => void };
}) {
  return (
    <div className="flex items-center gap-1">
      <IconBtn label={context.labels.view} color="text-brand-500 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10" onClick={() => context.onView(data)}>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      </IconBtn>
      <IconBtn label={context.labels.del} color="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => context.onDelete(data.id)}>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </IconBtn>
    </div>
  );
}

function StatusCell({ value, context }: { value: ContactStatus; context: { statusLabels: Record<string, string> } }) {
  return <StatusBadge status={value} labels={context.statusLabels} />;
}

function TextCell({ value }: { value: string }) {
  return <span className="line-clamp-1 text-gray-800 dark:text-gray-200">{value}</span>;
}

function DateCell({ value, context }: { value: string; context: { lang: string } }) {
  if (!value) return null;
  const d = new Date(value);
  const locale = context?.lang === "fa" ? "fa-IR" : "en-US";
  return <span className="text-gray-500 dark:text-gray-400 text-xs">{d.toLocaleDateString(locale)}</span>;
}

export default function AdminContact() {
  const t = useT();
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const isRTL = lang === "fa";
  const gridRef = useRef<AgGridReact<ContactRow>>(null);

  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTarget, setViewTarget] = useState<ContactRow | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/contact");
    const data = await res.json();
    setRows(Array.isArray(data) ? data.map((r: ContactRow & { _id: string }) => ({ ...r, id: r._id ?? r.id })) : []);
    setLoading(false);
  }, []);

  useEffect(() => { queueMicrotask(fetchRows); }, [fetchRows]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("contactDeleteConfirm"))) return;
    await fetch(`/api/admin/contact/${id}`, { method: "DELETE" });
    toast.success(t("contactDeleted"));
    if (viewTarget?.id === id) setViewTarget(null);
    fetchRows();
  };

  const handleStatus = async (id: string, status: ContactStatus) => {
    setUpdating(true);
    await fetch(`/api/admin/contact/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setUpdating(false);
    toast.success(t("contactSaved"));
    setViewTarget((prev) => prev?.id === id ? { ...prev, status } : prev);
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  };

  const statusLabels: Record<string, string> = {
    new: t("contactStatusNew"),
    read: t("contactStatusRead"),
    replied: t("contactStatusReplied"),
  };

  const context = useMemo(() => ({
    lang,
    statusLabels,
    labels: { view: t("contactView"), del: t("contactDelete") },
    onView: (r: ContactRow) => {
      setViewTarget(r);
      if (r.status === "new") handleStatus(r.id, "read");
    },
    onDelete: handleDelete,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [lang]);

  const colDefs = useMemo<ColDef<ContactRow>[]>(() => {
    const cols: ColDef<ContactRow>[] = [
      { headerName: "#", width: 60, sortable: false, filter: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
      { field: "name",      headerName: t("contactColName"),    width: 140, cellRenderer: TextCell },
      { field: "email",     headerName: t("contactColEmail"),   flex: 1, minWidth: 180, cellRenderer: TextCell },
      { field: "subject",   headerName: t("contactColSubject"), flex: 1, minWidth: 180, cellRenderer: TextCell },
      { field: "status",    headerName: t("contactColStatus"),  width: 140, cellRenderer: StatusCell },
      { field: "createdAt", headerName: t("contactColDate"),    width: 120, cellRenderer: DateCell, sort: "desc" },
      { headerName: t("contactColActions"), width: 100, sortable: false, filter: false, cellRenderer: ActionsCell },
    ];
    return cols;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRTL, lang]);

  const newCount = rows.filter((r) => r.status === "new").length;

  return (
    <div className="p-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("contactTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {rows.length} {t("contactTotal")}
            {newCount > 0 && (
              <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                {newCount} {t("contactStatusNew")}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">{t("contactLoading")}</div>
      ) : rows.length === 0 ? (
        <div className="py-20 text-center text-gray-400">{t("contactEmpty")}</div>
      ) : (
        <div className="h-[520px] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
          <AgGridReact
            ref={gridRef}
            rowData={rows}
            columnDefs={colDefs}
            context={context}
            theme={theme === "dark" ? darkTheme : lightTheme}
            rowHeight={52}
            headerHeight={40}
            defaultColDef={{ resizable: true, sortable: true, filter: false }}
            enableRtl={isRTL}
          />
        </div>
      )}

      {/* View modal */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={() => setViewTarget(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            {/* Status badge + header */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{viewTarget.subject}</h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {viewTarget.name} · <a href={`mailto:${viewTarget.email}`} className="text-brand-500 hover:underline">{viewTarget.email}</a>
                </p>
              </div>
              <StatusBadge status={viewTarget.status} labels={statusLabels} />
            </div>

            {/* Message body */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-300 whitespace-pre-wrap">
              {viewTarget.message}
            </div>

            {/* Date */}
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
              {new Date(viewTarget.createdAt).toLocaleDateString(isRTL ? "fa-IR" : "en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                {viewTarget.status !== "read" && (
                  <button
                    onClick={() => handleStatus(viewTarget.id, "read")}
                    disabled={updating}
                    className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 disabled:opacity-50"
                  >
                    {t("contactMarkRead")}
                  </button>
                )}
                {viewTarget.status !== "replied" && (
                  <button
                    onClick={() => handleStatus(viewTarget.id, "replied")}
                    disabled={updating}
                    className="rounded-xl bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                  >
                    {t("contactMarkReplied")}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(viewTarget.id)}
                  className="rounded-xl bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                >
                  {t("contactDelete")}
                </button>
              </div>
              <button
                onClick={() => setViewTarget(null)}
                className="rounded-xl border border-gray-200 px-4 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
              >
                {t("contactClose")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
