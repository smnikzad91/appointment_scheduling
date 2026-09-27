"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz, type ColDef } from "ag-grid-community";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { Modal } from "@/components/ui/modal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { toast } from "sonner";
import { SocialIcon, PLATFORM_LABELS } from "@/components/common/SocialIcon";
import type { SocialPlatform } from "@/types/content";

const PLATFORMS: SocialPlatform[] = [
  "telegram","instagram","twitter","youtube",
  "linkedin","whatsapp","discord","github","facebook","tiktok",
];

interface SocialRow {
  id: string;
  platform: SocialPlatform;
  url: string;
  label: string;
  active: boolean;
  order: number;
}

type GridCtx = {
  isRTL: boolean;
  onEdit: (row: SocialRow) => void;
  onDelete: (id: string, platform: SocialPlatform) => void;
  onToggle: (id: string, current: boolean) => void;
  labels: { edit: string; del: string; active: string; inactive: string };
};

// ── Themes ─────────────────────────────────────────────────────────────────────
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

// ── Cell Renderers ─────────────────────────────────────────────────────────────
function PlatformCell({ data }: { data: SocialRow }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
        <SocialIcon platform={data.platform} className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium text-gray-800 dark:text-white">{PLATFORM_LABELS[data.platform]}</span>
    </div>
  );
}

function UrlCell({ value }: { value: string }) {
  return (
    <a href={value} target="_blank" rel="noopener noreferrer"
      className="text-sm text-brand-600 hover:underline dark:text-brand-400 truncate block max-w-[240px]">
      {value}
    </a>
  );
}

function StatusCell({ data, context }: { data: SocialRow; context: GridCtx }) {
  return (
    <button
      onClick={() => context.onToggle(data.id, data.active)}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
        data.active
          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/10 dark:text-green-400"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500"
      }`}
    >
      {data.active ? context.labels.active : context.labels.inactive}
    </button>
  );
}

function IconBtn({ label, color, children, onClick }: {
  label: string; color: string; children: React.ReactNode; onClick: () => void;
}) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const enter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.bottom + 8 });
  };
  return (
    <>
      <button onClick={onClick} className={`rounded-lg p-1.5 transition-colors ${color}`}
        onMouseEnter={enter} onMouseLeave={() => setTip(null)} aria-label={label}>
        {children}
      </button>
      {tip && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", left: tip.x, top: tip.y, transform: "translateX(-50%)", zIndex: 9999, pointerEvents: "none" }}
          className="rounded px-2 py-1 text-xs text-white bg-gray-800 whitespace-nowrap">{label}</div>,
        document.body
      )}
    </>
  );
}

function ActionsCell({ data, context }: { data: SocialRow; context: GridCtx }) {
  return (
    <div className="flex items-center gap-1.5">
      <IconBtn label={context.labels.edit} color="text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10" onClick={() => context.onEdit(data)}>
        <PencilIcon className="w-4 h-4" />
      </IconBtn>
      <IconBtn label={context.labels.del} color="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => context.onDelete(data.id, data.platform)}>
        <TrashBinIcon className="w-4 h-4" />
      </IconBtn>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
const defaultForm = { platform: "telegram" as SocialPlatform, url: "", label: "", active: true, order: 0 };

const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1";

function FormFields({ form, onChange, t }: {
  form: typeof defaultForm;
  onChange: (f: typeof defaultForm) => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>{t("socialFieldPlatform")}</label>
        <select value={form.platform} onChange={(e) => onChange({ ...form, platform: e.target.value as SocialPlatform })} className={inputClass}>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>{t("socialFieldUrl")}</label>
        <input required type="url" value={form.url} onChange={(e) => onChange({ ...form, url: e.target.value })}
          placeholder={t("socialFieldUrlPlaceholder")} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t("socialFieldLabel")}</label>
        <input type="text" value={form.label} onChange={(e) => onChange({ ...form, label: e.target.value.replace(/^#/, "") })}
          placeholder={t("socialFieldLabelPlaceholder")} className={inputClass} />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className={labelClass}>{t("socialFieldOrder")}</label>
          <input type="number" value={form.order} onChange={(e) => onChange({ ...form, order: Number(e.target.value) })}
            className={inputClass} />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="active-toggle" checked={form.active} onChange={(e) => onChange({ ...form, active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 accent-brand-500" />
          <label htmlFor="active-toggle" className="text-sm text-gray-700 dark:text-gray-300">{t("socialFieldActive")}</label>
        </div>
      </div>
    </div>
  );
}

export default function AdminSocialLinks() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const { theme } = useTheme();

  const [rows, setRows] = useState<SocialRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(defaultForm);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [editTarget, setEditTarget] = useState<SocialRow | null>(null);
  const [editForm, setEditForm] = useState(defaultForm);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; platform: SocialPlatform } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLinks = () => {
    setLoading(true);
    fetch("/api/admin/social-links")
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { queueMicrotask(fetchLinks); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    const res = await fetch("/api/admin/social-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { setAddError(data.error ?? "Failed to create"); return; }
    toast.success(t("socialSaved"));
    setAddOpen(false);
    setAddForm(defaultForm);
    fetchLinks();
  };

  const startEdit = (row: SocialRow) => {
    setEditTarget(row);
    setEditForm({ platform: row.platform, url: row.url, label: (row.label || "").replace(/^#/, ""), active: row.active, order: row.order });
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditError("");
    setEditSaving(true);
    const res = await fetch(`/api/admin/social-links/${editTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { setEditError(data.error ?? "Failed to save"); return; }
    toast.success(t("socialSaved"));
    setEditTarget(null);
    fetchLinks();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await fetch(`/api/admin/social-links/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    fetchLinks();
  };

  const handleDelete = (id: string, platform: SocialPlatform) => setDeleteTarget({ id, platform });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await fetch(`/api/admin/social-links/${deleteTarget.id}`, { method: "DELETE" });
    toast.success(t("socialDeleted"));
    setDeleteTarget(null);
    setIsDeleting(false);
    fetchLinks();
  };

  const gridContext = useMemo<GridCtx>(() => ({
    isRTL,
    onEdit: startEdit,
    onDelete: handleDelete,
    onToggle: handleToggle,
    labels: { edit: t("socialEdit"), del: t("socialDelete"), active: t("socialActive"), inactive: t("socialInactive") },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isRTL, lang]);

  const colDefs = useMemo<ColDef<SocialRow>[]>(() => {
    const cols: ColDef<SocialRow>[] = [
      { headerName: "#", width: 60, sortable: false, filter: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
      { field: "platform", headerName: t("socialColPlatform"), width: 160, sortable: true, filter: false, cellRenderer: PlatformCell },
      { field: "url", headerName: t("socialColUrl"), flex: 2, minWidth: 200, sortable: false, filter: false, cellRenderer: UrlCell },
      { field: "label", headerName: t("socialColLabel"), width: 150, sortable: false, filter: false, valueFormatter: (p) => p.value ? p.value.replace(/^#/, "") : "" },
      { field: "order", headerName: t("socialColOrder"), width: 90, sortable: true, filter: false },
      { field: "active", headerName: t("socialColStatus"), width: 110, sortable: true, filter: false, cellRenderer: StatusCell },
      { headerName: t("socialColActions"), width: 110, sortable: false, filter: false, cellRenderer: ActionsCell },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [t, isRTL]);

  return (
    <div className="p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("socialLinksTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{rows.length} {t("socialLinksTotal")}</p>
        </div>
        <button onClick={() => { setAddForm(defaultForm); setAddError(""); setAddOpen(true); }}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600">
          {t("socialAddLink")}
        </button>
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("socialLoading")}</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("socialEmpty")}</div>
        ) : (
          <div className="ag-blog-table">
            <AgGridReact<SocialRow>
              rowData={rows}
              columnDefs={colDefs}
              theme={theme === "dark" ? agDark : agLight}
              domLayout="autoHeight"
              rowHeight={56}
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

      {/* Add Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} showCloseButton={false} className="max-w-md mx-4">
        <form onSubmit={handleAdd} className="p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t("socialAddModal")}</h3>
          <FormFields form={addForm} onChange={setAddForm} t={t} />
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} disabled={adding}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {t("socialCancel")}
            </button>
            <button type="submit" disabled={adding}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">
              {adding ? t("socialSaving") : t("socialSave")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} showCloseButton={false} className="max-w-md mx-4">
        <form onSubmit={handleSaveEdit} className="p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t("socialEditModal")}</h3>
          <FormFields form={editForm} onChange={setEditForm} t={t} />
          {editError && <p className="text-xs text-red-500">{editError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditTarget(null)} disabled={editSaving}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {t("socialCancel")}
            </button>
            <button type="submit" disabled={editSaving}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">
              {editSaving ? t("socialSaving") : t("socialSaveChanges")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title={t("socialDeleteConfirm")}
        itemName={deleteTarget ? PLATFORM_LABELS[deleteTarget.platform] : ""}
        confirmLabel={t("socialDelete")}
        cancelLabel={t("socialCancel")}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
