"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz, type ColDef } from "ag-grid-community";
import { Modal } from "@/components/ui/modal";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string;
  postCount: number;
}

type GridCtx = {
  isRTL: boolean;
  onEdit: (cat: Category) => void;
  onDelete: (id: string, name: string, postCount: number) => void;
  labels: { edit: string; del: string; posts: string };
};

// ── Themes ────────────────────────────────────────────────────────────────────
const agLight = themeQuartz.withParams({
  accentColor:             "#465fff",
  backgroundColor:         "#ffffff",
  foregroundColor:         "#111827",
  borderColor:             "#e5e7eb",
  chromeBackgroundColor:   "#f9fafb",
  headerTextColor:         "#6b7280",
  rowHoverColor:           "#f9fafb",
  columnBorder:            false,
  rowBorder:               { color: "#f3f4f6" },
  fontSize:                14,
  fontFamily:              "inherit",
  rowVerticalPaddingScale: 1.3,
  headerFontSize:          12,
});

const agDark = themeQuartz.withParams({
  accentColor:             "#465fff",
  backgroundColor:         "#111827",
  foregroundColor:         "#f9fafb",
  borderColor:             "#374151",
  chromeBackgroundColor:   "#111827",
  headerTextColor:         "#9ca3af",
  rowHoverColor:           "rgba(255,255,255,0.02)",
  columnBorder:            false,
  rowBorder:               { color: "#1f2937" },
  fontSize:                14,
  fontFamily:              "inherit",
  rowVerticalPaddingScale: 1.3,
  headerFontSize:          12,
});

// ── Cell Renderers ─────────────────────────────────────────────────────────────
function NameCell({ value }: { value: string }) {
  return <span className="font-semibold text-gray-900 dark:text-white">{value?.replace(/^#/, "")}</span>;
}

function DescCell({ value }: { value: string }) {
  return value
    ? <span className="text-gray-500 dark:text-gray-400">{value}</span>
    : <span className="text-gray-300 dark:text-gray-600">—</span>;
}

function PostCountCell({ value, context }: { value: number; context: GridCtx }) {
  return (
    <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
      value > 0
        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
        : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
    }`}>
      {value} {context.labels.posts}
    </span>
  );
}

function IconBtn({ label, color, children, onClick }: {
  label: string;
  color: string;
  children: React.ReactNode;
  onClick: () => void;
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
          className="rounded px-2 py-1 text-xs text-white bg-gray-800 whitespace-nowrap">
          {label}
        </div>,
        document.body
      )}
    </>
  );
}

function ActionsCell({ data, context }: { data: Category; context: GridCtx }) {
  return (
    <div className="flex items-center gap-1.5">
      <IconBtn label={context.labels.edit} color="text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10" onClick={() => context.onEdit(data)}>
        <PencilIcon className="w-4 h-4" />
      </IconBtn>
      <IconBtn label={context.labels.del} color="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => context.onDelete(data.id, data.name, data.postCount)}>
        <TrashBinIcon className="w-4 h-4" />
      </IconBtn>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminBlogCategories() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const { theme } = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; postCount: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    fetch("/api/admin/blog/categories")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { queueMicrotask(fetchCategories); }, []);

  const openModal = () => { setAddName(""); setAddDesc(""); setAddError(""); setModalOpen(true); };
  const closeModal = () => { if (!adding) setModalOpen(false); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAdding(true);
    const res = await fetch("/api/admin/blog/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addName, description: addDesc }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { setAddError(data.error ?? "Failed to create"); return; }
    toast.success(t("blogCatSaved"));
    setModalOpen(false);
    fetchCategories();
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName((cat.name || "").replace(/^#/, ""));
    setEditDesc(cat.description);
    setEditError("");
    setEditModalOpen(true);
  };

  const closeEditModal = () => { if (!editSaving) { setEditModalOpen(false); setEditId(null); setEditError(""); } };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setEditError("");
    setEditSaving(true);
    const res = await fetch(`/api/admin/blog/categories/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDesc }),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { setEditError(data.error ?? "Failed to save"); return; }
    toast.success(t("blogCatSaved"));
    setEditModalOpen(false);
    setEditId(null);
    fetchCategories();
  };

  const handleDelete = (id: string, name: string, postCount: number) => {
    setDeleteTarget({ id, name, postCount });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await fetch(`/api/admin/blog/categories/${deleteTarget.id}`, { method: "DELETE" });
    setIsDeleting(false);
    toast.success(t("blogCatDeleted"));
    setDeleteTarget(null);
    fetchCategories();
  };

  const gridContext = useMemo<GridCtx>(() => ({
    isRTL,
    onEdit: startEdit,
    onDelete: handleDelete,
    labels: {
      edit:  t("blogEdit"),
      del:   t("blogDelete"),
      posts: t("blogCatPosts"),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isRTL, lang]);

  const colDefs = useMemo<ColDef<Category>[]>(() => {
    const cols: ColDef<Category>[] = [
      {
        field: "name",
        headerName: t("blogColName"),
        flex: 1,
        minWidth: 140,
        sortable: true,
        filter: false,
        cellRenderer: NameCell,
      },
      {
        field: "description",
        headerName: t("blogColDescription"),
        flex: 2,
        minWidth: 180,
        sortable: false,
        filter: false,
        cellRenderer: DescCell,
      },
      {
        field: "postCount",
        headerName: t("blogColPosts"),
        width: 130,
        sortable: true,
        filter: false,
        cellRenderer: PostCountCell,
      },
      {
        headerName: t("blogColActions"),
        width: 100,
        sortable: false,
        filter: false,
        cellRenderer: ActionsCell,
      },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [t, isRTL]);

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/20";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400";

  return (
    <div className="p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("blogCatsTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{categories.length} {t("blogCatsCount")}</p>
        </div>
        <button
          onClick={openModal}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          {t("blogAddCat")}
        </button>
      </div>

      {/* Add modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} className="max-w-md p-6 mx-4">
        <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">{t("blogAddCatModal")}</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className={labelClass}>{t("blogCatName")}</label>
            <input required autoFocus value={addName} onChange={(e) => setAddName(e.target.value.replace(/^#/, ""))} className={inputClass} placeholder={t("blogCatNamePlaceholder")} />
          </div>
          <div>
            <label className={labelClass}>{t("blogCatDesc")}</label>
            <input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} className={inputClass} placeholder={t("blogCatDescPlaceholder")} />
          </div>
          {addError && <p className="text-xs text-red-500">{addError}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={adding} className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">
              {adding ? t("blogCatSaving") : t("blogCatSave")}
            </button>
            <button type="button" onClick={closeModal} disabled={adding} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
              {t("blogCatCancel")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={editModalOpen} onClose={closeEditModal} className="max-w-md p-6 mx-4">
        <h2 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">{t("blogEditCatModal")}</h2>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className={labelClass}>{t("blogCatName")}</label>
            <input required autoFocus value={editName} onChange={(e) => setEditName(e.target.value.replace(/^#/, ""))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t("blogCatDesc")}</label>
            <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className={inputClass} placeholder={t("blogCatDescPlaceholder")} />
          </div>
          {editError && <p className="text-xs text-red-500">{editError}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={editSaving} className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">
              {editSaving ? t("blogCatSaving") : t("blogCatSaveChanges")}
            </button>
            <button type="button" onClick={closeEditModal} disabled={editSaving} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
              {t("blogCatCancel")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Grid */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("blogLoading")}</div>
        ) : categories.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("blogCatEmpty")}</div>
        ) : (
          <div className="ag-blog-table">
            <AgGridReact<Category>
              rowData={categories}
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

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title={t("blogCatDeleteConfirm")}
        itemName={deleteTarget?.name ?? ""}
        warning={
          deleteTarget && deleteTarget.postCount > 0
            ? `${t("blogCatDeleteWarning")} ${deleteTarget.postCount} ${t("blogCatDeleteWarning2")}`
            : undefined
        }
        confirmLabel={t("blogDelete")}
        cancelLabel={t("blogCatCancel")}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
