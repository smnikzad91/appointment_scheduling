"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { themeQuartz } from "ag-grid-community";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

interface AnnouncementRow {
  id: string;
  text: string;
  link: string;
  linkText: string;
  emoji: string;
  active: boolean;
  order: number;
}

const defaultForm = { text: "", link: "", linkText: "", emoji: "🎉", active: true, order: 0 };

const EMOJI_LIST = [
  "🎉","📣","📢","🔔","🔥","⚡","🚀","✨","💡","🎁",
  "🏆","🎯","📌","📍","⭐","🌟","💎","🛒","🧩","📦",
  "🔒","🔓","🛡️","⚠️","✅","❌","❗","💬","📝","🗓️",
  "👋","🙌","👍","💪","🤝","🎓","📊","📈","💰","🌍",
  "🎨","🎬","🎤","🎧","🎵","🎶","🎮","🕹️","🖥️","📱",
  "🌈","🌙","☀️","❄️","🌊","🌿","🍀","🦋","🐝","🦄",
  "🍕","☕","🍺","🎂","🍭","🏅","🥇","🎗️","🔑","🗝️",
  "💌","📩","📨","🗣️","📡","🔭","🧬","⚙️","🔧","🛠️",
];

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" id={id}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-[38px] w-full items-center justify-center rounded-xl border border-gray-200 bg-white text-xl transition-colors hover:border-brand-400 hover:bg-brand-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-brand-600 dark:hover:bg-brand-500/10"
        aria-label="Pick emoji"
      >
        {value || "🎉"}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-[200] mt-2 w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="grid grid-cols-8 gap-1.5 max-h-52 overflow-y-auto pr-1">
            {EMOJI_LIST.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => { onChange(em); setOpen(false); }}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10 ${value === em ? "bg-brand-100 ring-2 ring-brand-400 dark:bg-brand-500/20" : ""}`}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cell renderers ──────────────────────────────────────────────────────────

function TextCell({ value }: { value: string }) {
  return <span className="line-clamp-1 text-gray-800 dark:text-gray-200">{value}</span>;
}

function LinkCell({ value }: { value: string }) {
  return value
    ? <a href={value} target="_blank" rel="noopener noreferrer" className="truncate text-brand-500 underline underline-offset-2 hover:text-brand-600">{value}</a>
    : <span className="text-gray-300 dark:text-gray-600">—</span>;
}

function StatusCell({ value, context }: { value: boolean; context: { labels: { active: string; inactive: string } } }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${value ? "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400" : "bg-gray-100 text-gray-400 dark:bg-gray-800"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${value ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
      {value ? context.labels.active : context.labels.inactive}
    </span>
  );
}

function IconBtn({ label, color, children, onClick }: { label: string; color: string; children: React.ReactNode; onClick: () => void }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const enter = (e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY });
  return (
    <button type="button" className={`relative flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${color}`}
      onMouseEnter={enter} onMouseLeave={() => setTip(null)} onClick={onClick} aria-label={label}>
      {children}
      {tip && (
        <div className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-8 rounded px-2 py-1 text-xs text-white bg-gray-800 whitespace-nowrap"
          style={{ left: tip.x, top: tip.y }}>{label}</div>
      )}
    </button>
  );
}

function ActionsCell({ data, context }: { data: AnnouncementRow; context: { labels: { edit: string; del: string }; onEdit: (r: AnnouncementRow) => void; onDelete: (id: string) => void } }) {
  return (
    <div className="flex items-center gap-1">
      <IconBtn label={context.labels.edit} color="text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10" onClick={() => context.onEdit(data)}>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      </IconBtn>
      <IconBtn label={context.labels.del} color="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => context.onDelete(data.id)}>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </IconBtn>
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1";

function FormFields({ form, onChange, t }: { form: typeof defaultForm; onChange: (f: typeof defaultForm) => void; t: ReturnType<typeof useT> }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="w-20 shrink-0">
          <label className={labelClass}>{t("annFieldEmoji")}</label>
          <EmojiPicker value={form.emoji} onChange={(em) => onChange({ ...form, emoji: em })} />
        </div>
        <div className="flex-1">
          <label className={labelClass}>{t("annFieldText")}</label>
          <input required type="text" value={form.text} onChange={(e) => onChange({ ...form, text: e.target.value })} className={inputClass} placeholder={t("annFieldTextPlaceholder")} />
        </div>
      </div>
      <div>
        <label className={labelClass}>{t("annFieldLink")}</label>
        <input type="text" value={form.link} onChange={(e) => onChange({ ...form, link: e.target.value })} className={inputClass} placeholder={t("annFieldLinkPlaceholder")} dir="ltr" />
      </div>
      <div>
        <label className={labelClass}>{t("annFieldLinkText")}</label>
        <input type="text" value={form.linkText} onChange={(e) => onChange({ ...form, linkText: e.target.value })} className={inputClass} placeholder={t("annFieldLinkTextPlaceholder")} />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className={labelClass}>{t("annFieldOrder")}</label>
          <input type="number" value={form.order} onChange={(e) => onChange({ ...form, order: Number(e.target.value) })} className={inputClass} />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="ann-active" checked={form.active} onChange={(e) => onChange({ ...form, active: e.target.checked })} className="h-4 w-4 rounded border-gray-300 accent-brand-500" />
          <label htmlFor="ann-active" className="text-sm text-gray-700 dark:text-gray-300">{t("annFieldActive")}</label>
        </div>
      </div>
    </div>
  );
}

// ── Light / dark ag-grid themes ─────────────────────────────────────────────

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

// ── Main component ──────────────────────────────────────────────────────────

export default function AdminAnnouncements() {
  const t = useT();
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const isRTL = lang === "fa";
  const gridRef = useRef<AgGridReact<AnnouncementRow>>(null);

  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(defaultForm);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit modal
  const [editTarget, setEditTarget] = useState<AnnouncementRow | null>(null);
  const [editForm, setEditForm] = useState(defaultForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/announcements");
    const data = await res.json();
    setRows(Array.isArray(data) ? data.map((r: AnnouncementRow & { _id: string }) => ({ ...r, id: r._id ?? r.id })) : []);
    setLoading(false);
  }, []);

  useEffect(() => { queueMicrotask(fetchRows); }, [fetchRows]);

  // ── Add ──
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(""); setAddSaving(true);
    const res = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(addForm) });
    setAddSaving(false);
    if (!res.ok) { setAddError((await res.json()).error ?? t("annError")); return; }
    toast.success(t("annAdded"));
    setAddOpen(false);
    setAddForm(defaultForm);
    fetchRows();
  };

  // ── Edit ──
  const startEdit = (row: AnnouncementRow) => {
    setEditTarget(row);
    setEditForm({ text: row.text, link: row.link, linkText: row.linkText, emoji: row.emoji, active: row.active, order: row.order });
    setEditError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditError(""); setEditSaving(true);
    const res = await fetch(`/api/admin/announcements/${editTarget.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setEditSaving(false);
    if (!res.ok) { setEditError((await res.json()).error ?? t("annError")); return; }
    toast.success(t("annSaved"));
    setEditTarget(null);
    fetchRows();
  };

  // ── Delete ──
  const handleDelete = async (id: string) => {
    if (!confirm(t("annDeleteConfirm"))) return;
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    toast.success(t("annDeleted"));
    fetchRows();
  };

  // ── Grid ──
  const context = useMemo(() => ({
    labels: { active: t("annActive"), inactive: t("annInactive"), edit: t("annEdit"), del: t("annDelete") },
    onEdit: startEdit,
    onDelete: handleDelete,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [lang]);

  const colDefs = useMemo<ColDef<AnnouncementRow>[]>(() => {
    const cols: ColDef<AnnouncementRow>[] = [
      { headerName: "#", width: 60, sortable: false, filter: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
      { field: "emoji", headerName: t("annColEmoji"), width: 80, sortable: false, filter: false },
      { field: "text", headerName: t("annColText"), flex: 2, minWidth: 200, sortable: false, filter: false, cellRenderer: TextCell },
      { field: "link", headerName: t("annColLink"), flex: 1, minWidth: 160, sortable: false, filter: false, cellRenderer: LinkCell },
      { field: "linkText", headerName: t("annColLinkText"), width: 130, sortable: false, filter: false },
      { field: "order", headerName: t("annColOrder"), width: 90, sortable: true, filter: false },
      { field: "active", headerName: t("annColStatus"), width: 110, sortable: true, filter: false, cellRenderer: StatusCell },
      { headerName: t("annColActions"), width: 100, sortable: false, filter: false, cellRenderer: ActionsCell },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [isRTL, lang]);

  return (
    <div className="p-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("annTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{rows.length} {t("annTotal")}</p>
        </div>
        <button
          onClick={() => { setAddForm(defaultForm); setAddError(""); setAddOpen(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          {t("annAddBtn")}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">{t("annLoading")}</div>
      ) : rows.length === 0 ? (
        <div className="py-20 text-center text-gray-400">{t("annEmpty")}</div>
      ) : (
        <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700">
          <AgGridReact
            ref={gridRef}
            rowData={rows}
            columnDefs={colDefs}
            context={context}
            theme={theme === "dark" ? darkTheme : lightTheme}
            rowHeight={48}
            headerHeight={40}
            defaultColDef={{ resizable: true }}
            enableRtl={isRTL}
          />
        </div>
      )}

      {/* Add modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">{t("annAddModal")}</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <FormFields form={addForm} onChange={setAddForm} t={t} />
              {addError && <p className="text-sm text-red-500">{addError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAddOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400">{t("annCancel")}</button>
                <button type="submit" disabled={addSaving} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                  {addSaving ? t("annSaving") : t("annSave")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={() => setEditTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">{t("annEditModal")}</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <FormFields form={editForm} onChange={setEditForm} t={t} />
              {editError && <p className="text-sm text-red-500">{editError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditTarget(null)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400">{t("annCancel")}</button>
                <button type="submit" disabled={editSaving} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
                  {editSaving ? t("annSaving") : t("annSaveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
