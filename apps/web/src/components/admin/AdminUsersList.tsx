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

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "user";
  walletBalance: number;
  avatar: string;
  phone: string;
  createdAt: string;
}

type GridCtx = {
  isRTL: boolean;
  onEdit: (user: UserRow) => void;
  onDelete: (id: string, name: string) => void;
  labels: { edit: string; del: string };
};

// ── Themes ─────────────────────────────────────────────────────────────────────
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
function NameCell({ data, context }: { data: UserRow; context: GridCtx }) {
  const fullName = `${data.firstName} ${data.lastName}`;
  const initials = `${data.firstName[0] ?? ""}${data.lastName[0] ?? ""}`.toUpperCase();
  return (
    <div className="flex w-full items-center gap-2.5" dir={context.isRTL ? "rtl" : "ltr"}>
      {data.avatar
        ? <img src={data.avatar} alt={fullName} className="h-9 w-9 rounded-full object-cover shrink-0 border border-gray-100 dark:border-gray-700" />
        : <div className="h-9 w-9 rounded-full bg-brand-100 dark:bg-brand-500/20 shrink-0 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400">{initials}</div>
      }
      <div className="flex flex-col leading-tight min-w-0">
        <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{fullName}</span>
        <span className="text-[11px] text-gray-400 truncate">{data.email}</span>
      </div>
    </div>
  );
}

function RoleCell({ data }: { data: UserRow }) {
  return data.role === "admin"
    ? <span className="rounded-lg bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">Admin</span>
    : <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">User</span>;
}

function PhoneCell({ value }: { value: string }) {
  return <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{value || "—"}</span>;
}

function WalletCell({ value }: { value: number }) {
  return (
    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
      {value.toLocaleString()}
    </span>
  );
}

function DateCell({ value, context }: { value: string; context: GridCtx }) {
  const formatted = value
    ? new Date(value).toLocaleDateString(context.isRTL ? "fa-IR" : "en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : "—";
  return <span dir={context.isRTL ? "rtl" : "ltr"}>{formatted}</span>;
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
          className="rounded px-2 py-1 text-xs text-white bg-gray-800 whitespace-nowrap">
          {label}
        </div>,
        document.body
      )}
    </>
  );
}

function ActionsCell({ data, context }: { data: UserRow; context: GridCtx }) {
  return (
    <div className="flex items-center gap-1.5">
      <IconBtn label={context.labels.edit} color="text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10" onClick={() => context.onEdit(data)}>
        <PencilIcon className="w-4 h-4" />
      </IconBtn>
      <IconBtn label={context.labels.del} color="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => context.onDelete(data.id, `${data.firstName} ${data.lastName}`)}>
        <TrashBinIcon className="w-4 h-4" />
      </IconBtn>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminUsersList() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const { theme } = useTheme();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "user">("user");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchUsers = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { queueMicrotask(fetchUsers); }, []);

  // Stats derived from user list
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      total:     users.length,
      admins:    users.filter((u) => u.role === "admin").length,
      regular:   users.filter((u) => u.role === "user").length,
      newMonth:  users.filter((u) => new Date(u.createdAt) >= monthStart).length,
    };
  }, [users]);

  const handleEdit = (user: UserRow) => {
    setEditTarget(user);
    setEditRole(user.role);
    setEditPhone(user.phone ?? "");
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    setEditError("");
    const res = await fetch(`/api/admin/users/${editTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editRole, phone: editPhone }),
    });
    setEditSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error ?? t("userSave"));
      return;
    }
    toast.success(t("userSaved"));
    setEditTarget(null);
    fetchUsers();
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
    setIsDeleting(false);
    toast.success(t("userDeleted"));
    setDeleteTarget(null);
    fetchUsers();
  };

  const gridContext = useMemo<GridCtx>(() => ({
    isRTL,
    onEdit: handleEdit,
    onDelete: handleDelete,
    labels: {
      edit: t("userEdit"),
      del:  t("userDelete"),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isRTL, lang]);

  const colDefs = useMemo<ColDef<UserRow>[]>(() => {
    const cols: ColDef<UserRow>[] = [
      { headerName: "#", width: 60, sortable: false, filter: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
      { field: "firstName", headerName: t("colUser"), flex: 2, minWidth: 200, sortable: true, filter: false, cellRenderer: NameCell },
      { field: "role", headerName: t("colRole"), width: 110, sortable: true, filter: false, cellRenderer: RoleCell },
      { field: "phone", headerName: t("colPhone"), width: 150, sortable: false, filter: false, cellRenderer: PhoneCell },
      { field: "walletBalance", headerName: t("colWallet"), width: 130, sortable: true, filter: false, cellRenderer: WalletCell },
      { field: "createdAt", headerName: t("colJoined"), width: 150, sortable: true, filter: false, cellRenderer: DateCell },
      { headerName: t("colActions"), width: 110, sortable: false, filter: false, cellRenderer: ActionsCell },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [t, isRTL]);

  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white";
  const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1";

  return (
    <div className="p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: t("statTotalUsers"),   value: stats.total },
          { label: t("statAdmins"),        value: stats.admins },
          { label: t("statRegularUsers"),  value: stats.regular },
          { label: t("statNewThisMonth"),  value: stats.newMonth },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{loading ? "…" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("allUsers")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{users.length} {isRTL ? "کاربر" : "users"}</p>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("userLoading")}</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("userEmpty")}</div>
        ) : (
          <div className="ag-blog-table">
            <AgGridReact<UserRow>
              rowData={users}
              columnDefs={colDefs}
              theme={theme === "dark" ? agDark : agLight}
              domLayout="autoHeight"
              rowHeight={64}
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

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} showCloseButton={false} className="max-w-sm mx-4">
        <form onSubmit={handleSaveEdit} className="p-6 sm:p-8 space-y-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t("userEditTitle")}</h3>
          {editTarget && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {editTarget.firstName} {editTarget.lastName}
            </p>
          )}

          <div>
            <label className={labelClass}>{t("userEditRole")}</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as "admin" | "user")}
              className={inputClass}
            >
              <option value="user">{t("roleUser")}</option>
              <option value="admin">{t("roleAdmin")}</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>{t("userEditPhone")}</label>
            <input
              type="text"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder={t("userEditPhonePlaceholder")}
              className={inputClass}
            />
          </div>

          {editError && <p className="text-xs text-red-500">{editError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditTarget(null)}
              disabled={editSaving}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {t("userCancel")}
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {editSaving ? t("userSaving") : t("userSave")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title={t("userDeleteConfirm")}
        itemName={deleteTarget?.name ?? ""}
        confirmLabel={t("userDelete")}
        cancelLabel={t("userCancel")}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
