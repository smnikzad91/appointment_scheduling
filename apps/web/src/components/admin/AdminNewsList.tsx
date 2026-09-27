"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz, type ColDef } from "ag-grid-community";
import { EyeIcon, CheckCircleIcon, CloseLineIcon, PencilIcon, TrashBinIcon, PaperPlaneIcon } from "@/icons";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import { toast } from "sonner";

interface NewsRow {
  id: string;
  category: string;
  hashtags: string[];
  title: string;
  image?: string;
  highlight: boolean;
  published: boolean;
  publishedAt: string;
}

type GridCtx = {
  isRTL: boolean;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string, title: string) => void;
  onTelegram: (id: string) => void;
  labels: { view: string; edit: string; del: string; published: string; draft: string; telegram: string };
};

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

function DateCell({ value, context }: { value: string; context: GridCtx }) {
  const formatted = value
    ? new Date(value).toLocaleDateString(context.isRTL ? "fa-IR" : "en-US", {
        year: "numeric", month: "short", day: "numeric",
      })
    : "—";
  return <span dir={context.isRTL ? "rtl" : "ltr"}>{formatted}</span>;
}

function TitleCell({ data, context }: { data: NewsRow; context: GridCtx }) {
  return (
    <div className="flex w-full items-center gap-2.5" dir={context.isRTL ? "rtl" : "ltr"}>
      {data.image
        ? <img src={data.image} alt="" className="h-9 w-12 rounded-md object-cover shrink-0 border border-gray-100 dark:border-gray-700" />
        : <div className="h-9 w-12 rounded-md bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center text-lg">📰</div>
      }
      <div className="flex flex-col leading-tight min-w-0">
        <span className="font-medium text-gray-900 dark:text-white line-clamp-1 text-sm">{data.title}</span>
        {data.highlight
          ? <span className="text-[10px] font-semibold text-green-500">● تازه‌ترین</span>
          : data.hashtags?.length > 0
            ? <div className="flex flex-wrap gap-1 mt-0.5">
                {data.hashtags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-brand-50 px-1.5 py-px text-[10px] font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    #{tag.replace(/^#/, "")}
                  </span>
                ))}
              </div>
            : null
        }
      </div>
    </div>
  );
}

function TagCell({ value }: { value: string }) {
  return (
    <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {value?.replace(/^#/, "")}
    </span>
  );
}

function StatusCell({ data, context }: { data: NewsRow; context: GridCtx }) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const enter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.bottom + 8 });
  };
  const label = data.published ? context.labels.published : context.labels.draft;
  return (
    <>
      <button
        onClick={() => context.onToggle(data.id, data.published)}
        onMouseEnter={enter}
        onMouseLeave={() => setTip(null)}
        aria-label={label}
        className={`rounded-lg p-1.5 transition-colors ${
          data.published
            ? "text-green-500 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10"
            : "text-gray-300 hover:bg-gray-100 dark:text-gray-600 dark:hover:bg-gray-800"
        }`}
      >
        {data.published ? <CheckCircleIcon className="w-4 h-4" /> : <CloseLineIcon className="w-4 h-4" />}
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

function IconBtn({ label, color, children, onClick, href }: {
  label: string; color: string; children: React.ReactNode; onClick?: () => void; href?: string;
}) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const enter = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ x: r.left + r.width / 2, y: r.bottom + 8 });
  };
  const cls = `rounded-lg p-1.5 transition-colors ${color}`;
  const el = href
    ? <Link href={href} className={cls} onMouseEnter={enter} onMouseLeave={() => setTip(null)} aria-label={label}>{children}</Link>
    : <button onClick={onClick} className={cls} onMouseEnter={enter} onMouseLeave={() => setTip(null)} aria-label={label}>{children}</button>;
  return (
    <>
      {el}
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

function ActionsCell({ data, context }: { data: NewsRow; context: GridCtx }) {
  return (
    <div className="flex items-center gap-1.5">
      <IconBtn label={context.labels.view} color="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10" href={`/news/${data.id}`}>
        <EyeIcon className="w-4 h-4" />
      </IconBtn>
      <IconBtn label={context.labels.edit} color="text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10" href={`/admin/news/${data.id}/edit`}>
        <PencilIcon className="w-4 h-4" />
      </IconBtn>
      <IconBtn label={context.labels.telegram} color="text-sky-500 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10" onClick={() => context.onTelegram(data.id)}>
        <PaperPlaneIcon className={`w-4 h-4${context.isRTL ? " -scale-x-100" : ""}`} />
      </IconBtn>
      <IconBtn label={context.labels.del} color="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => context.onDelete(data.id, data.title)}>
        <TrashBinIcon className="w-4 h-4" />
      </IconBtn>
    </div>
  );
}

export default function AdminNewsList() {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const { theme } = useTheme();

  const [items, setItems] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchItems = () => {
    setLoading(true);
    fetch("/api/admin/news")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { queueMicrotask(fetchItems); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg("");
    const res = await fetch("/api/admin/news/seed", { method: "POST" });
    const data = await res.json();
    setSeedMsg(`${data.inserted} ${t("newsSeedDone")} ${data.skipped}`);
    setSeeding(false);
    fetchItems();
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteTarget({ id, title });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await fetch(`/api/admin/news/${deleteTarget.id}`, { method: "DELETE" });
    setIsDeleting(false);
    toast.success(t("newsDeleted"));
    setDeleteTarget(null);
    fetchItems();
  };

  const handleToggle = async (id: string, current: boolean) => {
    await fetch(`/api/admin/news/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !current }),
    });
    if (!current) toast.success(t("newsTelegramSent"));
    fetchItems();
  };

  const handleTelegram = async (id: string) => {
    const res = await fetch(`/api/admin/news/${id}/notify`, { method: "POST" });
    const data = await res.json();
    if (res.ok) toast.success(t("newsTelegramSent"));
    else toast.error(data.error ?? "Telegram error");
  };

  const gridContext = useMemo<GridCtx>(() => ({
    isRTL,
    onToggle: handleToggle,
    onDelete: handleDelete,
    onTelegram: handleTelegram,
    labels: {
      view:      t("newsView"),
      edit:      t("newsEdit"),
      del:       t("newsDelete"),
      published: t("newsPublished"),
      draft:     t("newsDraft"),
      telegram:  t("newsTelegram"),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isRTL, lang]);

  const colDefs = useMemo<ColDef<NewsRow>[]>(() => {
    const cols: ColDef<NewsRow>[] = [
      { headerName: "#", width: 60, sortable: false, filter: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
      { field: "title", headerName: t("newsColTitle"), flex: 2, minWidth: 180, sortable: true, filter: false, cellRenderer: TitleCell },
      { field: "category", headerName: t("newsColCategory"), width: 150, sortable: true, filter: false, cellRenderer: TagCell },
      { field: "publishedAt", headerName: t("newsColDate"), width: 150, sortable: true, filter: false, cellRenderer: DateCell },
      { field: "published", headerName: t("newsColStatus"), width: 90, sortable: true, filter: false, cellRenderer: StatusCell },
      { headerName: t("newsColActions"), width: 160, sortable: false, filter: false, cellRenderer: ActionsCell },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [t, isRTL]);

  return (
    <div className="p-6 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("newsListTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{items.length} {t("newsListTotal")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {items.length === 0 && !loading && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
            >
              {seeding ? t("newsSeeding") : t("newsSeedBtn")}
            </button>
          )}
          <Link href="/admin/news/new" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600">
            {t("newsNewItem")}
          </Link>
        </div>
      </div>

      {seedMsg && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400">
          {seedMsg}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("newsLoading")}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("newsEmpty")}</div>
        ) : (
          <div className="ag-blog-table">
            <AgGridReact<NewsRow>
              rowData={items}
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

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        title={t("newsDeleteConfirm")}
        itemName={deleteTarget?.title ?? ""}
        confirmLabel={t("newsDelete")}
        cancelLabel={t("cancel")}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
