"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz, type ColDef } from "ag-grid-community";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { Modal } from "@/components/ui/modal";

type Deposit = {
  id: string;
  amount: number;
  description: string;
  receiptImage: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string;
  interceptionCode: string;
  createdAt: string;
  user: { name: string; email: string } | null;
  card: { cardNumber: string; bankName: string } | null;
};

type DepositFilter = "all" | "pending" | "approved" | "rejected";

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

// ── Cell Renderers ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  approved: "bg-green-50  text-green-700  dark:bg-green-500/10  dark:text-green-400",
  rejected: "bg-red-50    text-red-700    dark:bg-red-500/10    dark:text-red-400",
};

function StatusCell({ value, context }: { value: string; context: { isRTL: boolean } }) {
  const labels: Record<string, [string, string]> = {
    pending:  ["Pending",  "در انتظار"],
    approved: ["Approved", "تأیید شده"],
    rejected: ["Rejected", "رد شده"],
  };
  const label = labels[value]?.[context.isRTL ? 1 : 0] ?? value;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[value] ?? ""}`}>
      {label}
    </span>
  );
}

function UserCell({ value }: { value: Deposit["user"] }) {
  if (!value) return <span className="text-gray-400">—</span>;
  return (
    <div dir="ltr" className="flex flex-col justify-center leading-tight">
      <span className="text-sm font-medium text-gray-800 dark:text-white">{value.name}</span>
      <span className="text-xs text-gray-400">{value.email}</span>
    </div>
  );
}

function CardCell({ value }: { value: Deposit["card"] }) {
  if (!value) return <span className="text-gray-400">—</span>;
  const last4 = value.cardNumber.slice(-4);
  return (
    <div className="leading-tight">
      <span dir="ltr" className="text-sm font-medium text-gray-700 dark:text-gray-200">****&nbsp;{last4}</span>
      <span className="ms-1.5 text-xs text-gray-400">{value.bankName}</span>
    </div>
  );
}

function AmountCell({ value }: { value: number }) {
  return <span dir="ltr" className="font-semibold">{value.toLocaleString()}</span>;
}

function DateCell({ value, context }: { value: string; context: { isRTL: boolean } }) {
  const formatted = new Date(value).toLocaleDateString(context.isRTL ? "fa-IR" : "en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  return <span dir="ltr">{formatted}</span>;
}

function ReceiptCell({ value }: { value: string }) {
  if (!value) return <span className="text-xs text-gray-400">—</span>;
  return (
    <a href={value} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-brand-500 hover:underline">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>
      View
    </a>
  );
}

function InterceptionCodeCell({ value, context }: { value: string; context: { copiedLabel: string } }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-xs text-gray-400">—</span>;
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(value, { description: context.copiedLabel });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div dir="ltr" className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{value}</span>
      <button onClick={handleCopy} className="shrink-0 text-gray-400 hover:text-brand-500 transition-colors" aria-label="Copy tracking code">
        {copied
          ? <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
        }
      </button>
    </div>
  );
}

function AdminNoteCell({ value }: { value: string }) {
  if (!value) return <span className="text-xs text-gray-400">—</span>;
  return <span className="text-xs text-gray-600 dark:text-gray-300">{value}</span>;
}

type ActionCtx = {
  isRTL: boolean;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
  onDelete:  (id: string) => void;
  approveLabel: string;
  rejectLabel:  string;
  deleteLabel:  string;
  copiedLabel:  string;
};

function ActionCell({ data, context }: { data: Deposit; context: ActionCtx }) {
  const [tip, setTip] = useState<{ label: string; x: number; y: number } | null>(null);

  const mkTip = (label: string) => (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, x: r.left + r.width / 2, y: r.bottom + 8 });
  };

  return (
    <div className="flex items-center gap-1.5">
      {data.status === "pending" && (
        <>
          <button
            onClick={() => context.onApprove(data.id)}
            aria-label={context.approveLabel}
            className="rounded-lg bg-green-500 p-1.5 text-white hover:bg-green-600 transition-colors"
            onMouseEnter={mkTip(context.approveLabel)}
            onMouseLeave={() => setTip(null)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </button>
          <button
            onClick={() => context.onReject(data.id)}
            aria-label={context.rejectLabel}
            className="rounded-lg bg-red-500 p-1.5 text-white hover:bg-red-600 transition-colors"
            onMouseEnter={mkTip(context.rejectLabel)}
            onMouseLeave={() => setTip(null)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </>
      )}
      {data.status === "rejected" && (
        <button
          onClick={() => context.onDelete(data.id)}
          aria-label={context.deleteLabel}
          className="rounded-lg bg-red-400 p-1.5 text-white hover:bg-red-500 transition-colors"
          onMouseEnter={mkTip(context.deleteLabel)}
          onMouseLeave={() => setTip(null)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
      {tip && typeof document !== "undefined" && createPortal(
        <div style={{ position: "fixed", left: tip.x, top: tip.y, transform: "translateX(-50%)", zIndex: 9999, pointerEvents: "none" }}
          className="px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap">
          {tip.label}
        </div>,
        document.body
      )}
    </div>
  );
}

type AdminCard = { id: string; cardNumber: string; ownerName: string; bankName: string };

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminFinancePage() {
  const t         = useT();
  const { lang }  = useLanguage();
  const isRTL     = lang === "fa";
  const { theme } = useTheme();

  const [deposits, setDeposits]       = useState<Deposit[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<DepositFilter>("all");

  // Reject modal
  const [rejectId, setRejectId]       = useState<string | null>(null);
  const [rejectNote, setRejectNote]   = useState("");
  const [rejecting, setRejecting]     = useState(false);

  // Destination cards
  const [adminCards, setAdminCards]         = useState<AdminCard[]>([]);
  const [showCardModal, setShowCardModal]   = useState(false);
  const [cardForm, setCardForm]             = useState({ cardNumber: "", ownerName: "", bankName: "" });
  const [addingCard, setAddingCard]         = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [copiedId, setCopiedId]             = useState<string | null>(null);

  const loadAdminCards = () => {
    fetch("/api/admin/finance/cards")
      .then((r) => r.json())
      .then((d) => setAdminCards(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  const openCardModal = () => { setCardForm({ cardNumber: "", ownerName: "", bankName: "" }); setShowCardModal(true); };

  const handleAddCard = async () => {
    setAddingCard(true);
    const res = await fetch("/api/admin/finance/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cardForm),
    });
    const data = await res.json();
    setAddingCard(false);
    if (res.ok) {
      toast.success(t("adminCardAdded"));
      setShowCardModal(false);
      loadAdminCards();
    } else {
      toast.error(data.error || t("saveError"));
    }
  };

  const handleDeleteAdminCard = async (id: string) => {
    setDeletingCardId(id);
    const res = await fetch(`/api/admin/finance/cards/${id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingCardId(null);
    if (res.ok) { toast.success(t("adminCardDeleted")); loadAdminCards(); }
    else        { toast.error(data.error || t("saveError")); }
  };

  const handleCopy = (card: AdminCard) => {
    navigator.clipboard.writeText(card.cardNumber);
    setCopiedId(card.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const formatCardNumber = (n: string) =>
    n.replace(/(.{4})/g, "$1 ").trim();

  const load = () => {
    setLoading(true);
    fetch("/api/admin/finance/deposits")
      .then((r) => r.json())
      .then((d) => setDeposits(Array.isArray(d) ? d : []))
      .catch(() => setDeposits([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { queueMicrotask(() => { load(); loadAdminCards(); }); }, []);

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/admin/finance/deposits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (res.ok) { toast.success(t("depositApproved")); load(); }
    else        { const d = await res.json(); toast.error(d.error || t("saveError")); }
  };

  const openRejectModal = (id: string) => { setRejectId(id); setRejectNote(""); };

  const handleReject = async () => {
    if (!rejectId) return;
    setRejecting(true);
    const res = await fetch(`/api/admin/finance/deposits/${rejectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected", adminNote: rejectNote }),
    });
    setRejecting(false);
    if (res.ok) { toast.success(t("depositRejected")); setRejectId(null); load(); }
    else        { const d = await res.json(); toast.error(d.error || t("saveError")); }
  };

  const handleDelete = async (id: string) => {
    const res  = await fetch(`/api/admin/finance/deposits/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) { toast.success(t("depositDeleted")); load(); }
    else        { toast.error(data.error || t("saveError")); }
  };

  const gridContext = useMemo<ActionCtx>(() => ({
    isRTL,
    onApprove:    handleApprove,
    onReject:     openRejectModal,
    onDelete:     handleDelete,
    approveLabel: t("approve"),
    rejectLabel:  t("reject"),
    deleteLabel:  t("delete"),
    copiedLabel:  t("copied"),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isRTL, t]);

  const [codeSearch, setCodeSearch] = useState("");

  const counts = useMemo(() => ({
    all:      deposits.length,
    pending:  deposits.filter((d) => d.status === "pending").length,
    approved: deposits.filter((d) => d.status === "approved").length,
    rejected: deposits.filter((d) => d.status === "rejected").length,
  }), [deposits]);

  const filtered = useMemo(() => {
    let rows = filter === "all" ? deposits : deposits.filter((d) => d.status === filter);
    const q = codeSearch.trim().toUpperCase();
    if (q) rows = rows.filter((d) => d.interceptionCode?.toUpperCase().includes(q));
    return rows;
  }, [deposits, filter, codeSearch]);

  const colDefs = useMemo<ColDef<Deposit>[]>(() => {
    const cols: ColDef<Deposit>[] = [
      { field: "user",         headerName: isRTL ? "کاربر" : "User",           flex: 1.5, minWidth: 160, sortable: false, filter: false, cellRenderer: UserCell, valueFormatter: () => "" },
      { field: "amount",       headerName: isRTL ? "مبلغ (تومان)" : "Amount (IRT)", flex: 1, minWidth: 120, sortable: true, filter: false, cellRenderer: AmountCell },
      { field: "card",         headerName: isRTL ? "کارت" : "Card",            flex: 1, minWidth: 150, sortable: false, filter: false, cellRenderer: CardCell, valueFormatter: () => "" },
      { field: "status",       headerName: isRTL ? "وضعیت" : "Status",         width: 140, sortable: true, filter: false, cellRenderer: StatusCell },
      { field: "receiptImage",     headerName: isRTL ? "رسید" : "Receipt",           width: 90,  sortable: false, filter: false, cellRenderer: ReceiptCell },
      { field: "createdAt",        headerName: isRTL ? "تاریخ" : "Date",             width: 140, sortable: true,  filter: false, cellRenderer: DateCell },
      { field: "interceptionCode", headerName: isRTL ? "کد پیگیری" : "Tracking Code", width: 180, sortable: false, filter: false, cellRenderer: InterceptionCodeCell },
      { field: "adminNote",        headerName: isRTL ? "یادداشت ادمین" : "Admin Note", flex: 1, minWidth: 140, sortable: false, filter: false, cellRenderer: AdminNoteCell },
      { headerName: "",        width: 130, sortable: false, filter: false, cellRenderer: ActionCell },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [isRTL]);

  const tabs: { key: DepositFilter; label: string }[] = [
    { key: "all",      label: isRTL ? "همه" : "All" },
    { key: "pending",  label: t("statusPending") },
    { key: "approved", label: t("statusApproved") },
    { key: "rejected", label: t("statusRejected") },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("adminFinanceTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("adminFinanceDesc")}</p>
      </div>

      {/* Destination Cards */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("adminCards")}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("adminCardsDesc")}</p>
          </div>
          <button
            onClick={openCardModal}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            {t("addAdminCard")}
          </button>
        </div>

        {/* Cards list */}
        {adminCards.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("noDepositDestinations")}</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {adminCards.map((card) => (
              <div key={card.id} className={`relative flex flex-col gap-2 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white w-72 shadow-md transition-opacity ${deletingCardId === card.id ? "opacity-50 pointer-events-none" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium opacity-75">{card.bankName}</span>
                  <button
                    onClick={() => handleDeleteAdminCard(card.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-400 hover:bg-red-500 transition-colors"
                    aria-label={t("delete")}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div dir="ltr" className="font-mono text-lg tracking-widest">{formatCardNumber(card.cardNumber)}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-75">{card.ownerName}</span>
                  <button
                    onClick={() => handleCopy(card)}
                    className="flex items-center gap-1 rounded-lg bg-white/20 hover:bg-white/30 px-2.5 py-1 text-xs font-medium transition-colors"
                  >
                    {copiedId === card.id ? (
                      <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>{t("copied")}</>
                    ) : (
                      <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>{t("copyCardNumber")}</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deposits */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("adminFinanceTitle")}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("adminFinanceDesc")}</p>
        </div>

        {/* Tracking code search */}
        <div className="relative w-64">
          <svg className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" style={{ [isRTL ? "right" : "left"]: "0.75rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"/>
          </svg>
          <input
            dir="ltr"
            value={codeSearch}
            onChange={(e) => setCodeSearch(e.target.value)}
            placeholder={isRTL ? "جستجو با کد پیگیری…" : "Search by tracking code…"}
            className={`w-full rounded-xl border border-gray-200 bg-gray-50 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 transition-colors font-mono ${isRTL ? "pr-9 pl-4" : "pl-9 pr-4"}`}
          />
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
            <div className="p-10 text-center text-sm text-gray-400">{t("noDeposits")}</div>
          ) : (
            <div className="ag-ticket-table" dir={isRTL ? "rtl" : "ltr"}>
              <AgGridReact<Deposit>
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

      {/* Add destination card modal */}
      <Modal isOpen={showCardModal} onClose={() => !addingCard && setShowCardModal(false)} className="max-w-md mx-4 w-full" showCloseButton={false}>
        <div dir="ltr" className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
              <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("addAdminCard")}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("adminCardsDesc")}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("cardNumber")}</label>
              <input
                dir="ltr"
                value={cardForm.cardNumber}
                onChange={(e) => setCardForm((f) => ({ ...f, cardNumber: e.target.value.replace(/\D/g, "").slice(0, 16) }))}
                placeholder="1234567890123456"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 transition-colors tracking-widest"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("cardOwner")}</label>
              <input
                value={cardForm.ownerName}
                onChange={(e) => setCardForm((f) => ({ ...f, ownerName: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("bankName")}</label>
              <input
                value={cardForm.bankName}
                onChange={(e) => setCardForm((f) => ({ ...f, bankName: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAddCard}
              disabled={addingCard || cardForm.cardNumber.length !== 16 || !cardForm.ownerName || !cardForm.bankName}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {addingCard ? (
                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>{t("submitting")}</>
              ) : t("addAdminCard")}
            </button>
            <button
              onClick={() => !addingCard && setShowCardModal(false)}
              disabled={addingCard}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal isOpen={!!rejectId} onClose={() => !rejecting && setRejectId(null)} className="max-w-md mx-4 w-full" showCloseButton={false}>
        <div dir={isRTL ? "rtl" : "ltr"} className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("rejectDeposit")}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("rejectDepositDesc")}</p>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("adminNote")}</label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder={t("adminNotePlaceholder")}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 resize-none"
            />
          </div>
          <div className={`flex gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              onClick={handleReject}
              disabled={rejecting}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
            >
              {rejecting ? (
                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>{t("submitting")}</>
              ) : t("reject")}
            </button>
            <button
              onClick={() => !rejecting && setRejectId(null)}
              disabled={rejecting}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
