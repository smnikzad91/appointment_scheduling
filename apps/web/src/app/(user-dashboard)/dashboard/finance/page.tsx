"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz, type ColDef } from "ag-grid-community";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { Modal } from "@/components/ui/modal";

type Card = {
  id: string;
  cardNumber: string;
  ownerName: string;
  bankName: string;
};

type Deposit = {
  id: string;
  amount: number;
  description: string;
  receiptImage: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string;
  interceptionCode: string;
  createdAt: string;
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
const DEPOSIT_STATUS_COLORS: Record<string, string> = {
  pending:  "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  approved: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

function StatusCell({ value, context }: { value: string; context: { isRTL: boolean } }) {
  const labels: Record<string, [string, string]> = {
    pending:  ["Pending",  "در انتظار"],
    approved: ["Approved", "تأیید شده"],
    rejected: ["Rejected", "رد شده"],
  };
  const label = labels[value]?.[context.isRTL ? 1 : 0] ?? value;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${DEPOSIT_STATUS_COLORS[value] ?? ""}`}>
      {label}
    </span>
  );
}

function AmountCell({ value }: { value: number }) {
  return <span dir="ltr" className="font-medium">{value.toLocaleString()}</span>;
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

function DateCell({ value, context }: { value: string; context: { isRTL: boolean } }) {
  const formatted = new Date(value).toLocaleDateString(context.isRTL ? "fa-IR" : "en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
  return <span dir="ltr">{formatted}</span>;
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

function DeleteDepositCell({ data, context }: { data: Deposit; context: { onDelete: (id: string) => void } }) {
  if (data.status === "approved") return null;
  return (
    <button
      onClick={() => context.onDelete(data.id)}
      className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-400 hover:bg-red-500 transition-colors"
      aria-label="Delete deposit"
    >
      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}

// ── Card display component ─────────────────────────────────────────────────────
function BankCard({ card, onDelete }: { card: Card; onDelete: (id: string) => void }) {
  const masked = card.cardNumber.replace(/(\d{4})(?=\d)/g, "$1 ");
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-5 text-white shadow-lg shadow-brand-500/20 min-w-[220px]" dir="ltr">
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/10" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-white/70">{card.bankName}</p>
          <button
            onClick={() => onDelete(card.id)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-400 hover:bg-red-500 transition-colors"
            aria-label="Delete card"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <p dir="ltr" className="font-mono text-lg tracking-widest">{masked}</p>
        <p className="mt-3 text-sm font-medium text-white/90">{card.ownerName}</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const t         = useT();
  const { lang }  = useLanguage();
  const isRTL     = lang === "fa";
  const { theme } = useTheme();

  // cards state
  const [cards, setCards]             = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [showCardModal, setShowCardModal] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [cardNumber, setCardNumber]   = useState("");
  const [ownerName, setOwnerName]     = useState("");
  const [bankName, setBankName]       = useState("");
  const [addingCard, setAddingCard]   = useState(false);
  const cardNumberRef = useRef<HTMLInputElement>(null);

  // destination cards (admin-owned)
  const [destCards, setDestCards]           = useState<Card[]>([]);
  const [copiedDestId, setCopiedDestId]     = useState<string | null>(null);

  const loadDestCards = () => {
    fetch("/api/user/finance/admin-cards")
      .then((r) => r.json())
      .then((d) => setDestCards(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  const handleCopyDest = (card: Card) => {
    navigator.clipboard.writeText(card.cardNumber);
    setCopiedDestId(card.id);
    setTimeout(() => setCopiedDestId(null), 1500);
  };

  const formatCardNumber = (n: string) => n.replace(/(.{4})/g, "$1 ").trim();

  // deposits state
  const [deposits, setDeposits]           = useState<Deposit[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(true);
  const [depositFilter, setDepositFilter] = useState<DepositFilter>("all");
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selCardId, setSelCardId]         = useState("");
  const [depAmount, setDepAmount]         = useState("");
  const [depDesc, setDepDesc]             = useState("");
  const [depReceipt, setDepReceipt]       = useState("");
  const [uploading, setUploading]         = useState(false);
  const [submittingDep, setSubmittingDep] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const receiptFileRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const loadCards = () => {
    setCardsLoading(true);
    fetch("/api/user/finance/cards")
      .then((r) => r.json())
      .then((d) => setCards(Array.isArray(d) ? d : []))
      .catch(() => setCards([]))
      .finally(() => setCardsLoading(false));
  };

  const loadDeposits = () => {
    setDepositsLoading(true);
    fetch("/api/user/finance/deposits")
      .then((r) => r.json())
      .then((d) => setDeposits(Array.isArray(d) ? d : []))
      .catch(() => setDeposits([]))
      .finally(() => setDepositsLoading(false));
  };

  useEffect(() => { queueMicrotask(() => { loadCards(); loadDeposits(); loadDestCards(); }); }, []);

  // ── Delete Card ─────────────────────────────────────────────────────────────
  const handleDeleteCard = async (id: string) => {
    setDeletingCardId(id);
    const res  = await fetch(`/api/user/finance/cards/${id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingCardId(null);
    if (res.ok) { toast.success(t("cardDeleted")); loadCards(); }
    else        { toast.error(data.error || t("saveError")); }
  };

  // ── Add Card ────────────────────────────────────────────────────────────────
  const openCardModal = () => {
    setCardNumber(""); setOwnerName(""); setBankName("");
    setShowCardModal(true);
    setTimeout(() => cardNumberRef.current?.focus(), 80);
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCard(true);
    const res  = await fetch("/api/user/finance/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber: cardNumber.replace(/\s/g, ""), ownerName, bankName }),
    });
    const data = await res.json();
    setAddingCard(false);
    if (res.ok) { toast.success(t("cardAdded")); setShowCardModal(false); loadCards(); }
    else        { toast.error(data.error || t("saveError")); }
  };

  const formatCardInput = (val: string) =>
    val.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");

  // ── New Deposit ─────────────────────────────────────────────────────────────
  const openDepositModal = () => {
    if (cards.length === 0) { toast.error(t("addCardFirst")); return; }
    setSelCardId(cards[0].id); setDepAmount(""); setDepDesc(""); setDepReceipt("");
    setSubmittedCode(null);
    setShowDepositModal(true);
    setTimeout(() => amountRef.current?.focus(), 80);
  };

  const handleReceiptSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch("/api/upload?folder=deposits", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok) setDepReceipt(data.url);
    else toast.error(data.error || (isRTL ? "خطا در آپلود" : "Upload failed"));
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(depAmount.replace(/,/g, ""));
    if (!selCardId)        { toast.error(t("depositCardRequired")); return; }
    if (amount < 1000)     { toast.error(t("depositAmountMin")); return; }
    setSubmittingDep(true);
    const res  = await fetch("/api/user/finance/deposits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId: selCardId, amount, description: depDesc, receiptImage: depReceipt }),
    });
    const data = await res.json();
    setSubmittingDep(false);
    if (res.ok) {
      setSubmittedCode(data.interceptionCode);
      loadDeposits();
    }
    else        { toast.error(data.error || t("saveError")); }
  };

  // ── Delete Deposit ───────────────────────────────────────────────────────────
  const handleDeleteDeposit = async (id: string) => {
    const res  = await fetch(`/api/user/finance/deposits/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) { toast.success(t("depositDeleted")); loadDeposits(); }
    else        { toast.error(data.error || t("saveError")); }
  };

  // ── Grid ────────────────────────────────────────────────────────────────────
  const gridContext = useMemo(() => ({ isRTL, onDelete: handleDeleteDeposit, copiedLabel: t("copied") }), [isRTL, t]);

  const filteredDeposits = useMemo(
    () => depositFilter === "all" ? deposits : deposits.filter((d) => d.status === depositFilter),
    [deposits, depositFilter]
  );

  const depositCounts = useMemo(() => ({
    all:      deposits.length,
    pending:  deposits.filter((d) => d.status === "pending").length,
    approved: deposits.filter((d) => d.status === "approved").length,
    rejected: deposits.filter((d) => d.status === "rejected").length,
  }), [deposits]);

  const colDefs = useMemo<ColDef<Deposit>[]>(() => {
    const cols: ColDef<Deposit>[] = [
      { field: "amount",    headerName: isRTL ? "مبلغ (تومان)" : "Amount (IRT)", flex: 1, minWidth: 120, sortable: true, filter: false, cellRenderer: AmountCell },
      { field: "card",      headerName: isRTL ? "کارت" : "Card",           flex: 1, minWidth: 150, sortable: false, filter: false, cellRenderer: CardCell, valueFormatter: () => "" },
      { field: "status",    headerName: isRTL ? "وضعیت" : "Status",        width: 140, sortable: true, filter: false, cellRenderer: StatusCell },
      { field: "createdAt", headerName: isRTL ? "تاریخ" : "Date",          width: 140, sortable: true, filter: false, cellRenderer: DateCell },
      { field: "receiptImage",     headerName: isRTL ? "رسید" : "Receipt",           width: 100, sortable: false, filter: false, cellRenderer: ReceiptCell },
      { field: "interceptionCode", headerName: isRTL ? "کد پیگیری" : "Tracking Code", width: 180, sortable: false, filter: false, cellRenderer: InterceptionCodeCell },
      { field: "adminNote",        headerName: isRTL ? "یادداشت ادمین" : "Admin Note", flex: 1, minWidth: 140, sortable: false, filter: false, cellRenderer: AdminNoteCell },
      { headerName: "",        width: 70,  sortable: false, filter: false, cellRenderer: DeleteDepositCell },
    ];
    return isRTL ? [...cols].reverse() : cols;
  }, [isRTL]);

  const depositFilterTabs: { key: DepositFilter; label: string }[] = [
    { key: "all",      label: isRTL ? "همه" : "All" },
    { key: "pending",  label: t("statusPending") },
    { key: "approved", label: t("statusApproved") },
    { key: "rejected", label: t("statusRejected") },
  ];

  return (
    <div className="space-y-8" dir={isRTL ? "rtl" : "ltr"}>
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("financeTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("financeDesc")}</p>
      </div>

      {/* ── Cards section ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("myCards")}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("addCardDesc")}</p>
          </div>
          <button
            onClick={openCardModal}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t("addCard")}
          </button>
        </div>

        {cardsLoading ? (
          <p className="text-sm text-gray-400">{t("loading")}</p>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("noCards")}</p>
            <button onClick={openCardModal} className="text-sm font-medium text-brand-500 hover:underline">
              {t("addCard")} →
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {cards.map((card) => (
              <div key={card.id} className={deletingCardId === card.id ? "opacity-50 pointer-events-none" : ""}>
                <BankCard card={card} onDelete={handleDeleteCard} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Deposit Destinations ───────────────────────────────────────────── */}
      {destCards.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("depositDestinations")}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("depositDestinationsDesc")}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {destCards.map((card) => (
              <div key={card.id} className="flex flex-col gap-2 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-4 text-white w-72 shadow-md">
                <span className="text-xs font-medium opacity-75">{card.bankName}</span>
                <div dir="ltr" className="font-mono text-lg tracking-widest">{formatCardNumber(card.cardNumber)}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-75">{card.ownerName}</span>
                  <button
                    onClick={() => handleCopyDest(card)}
                    className="flex items-center gap-1 rounded-lg bg-white/20 hover:bg-white/30 px-2.5 py-1 text-xs font-medium transition-colors"
                  >
                    {copiedDestId === card.id ? (
                      <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>{t("copied")}</>
                    ) : (
                      <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>{t("copyCardNumber")}</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Deposits section ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t("deposits")}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("depositDesc")}</p>
          </div>
          <button
            onClick={openDepositModal}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t("newDeposit")}
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {depositFilterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDepositFilter(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                depositFilter === tab.key
                  ? "bg-brand-500 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {tab.label}
              <span className={`ms-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                depositFilter === tab.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {depositCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {depositsLoading ? (
            <div className="p-10 text-center text-sm text-gray-400">{t("loading")}</div>
          ) : filteredDeposits.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-14">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("noDeposits")}</p>
              <button onClick={openDepositModal} className="mt-1 text-sm font-medium text-brand-500 hover:underline">
                {t("newDeposit")} →
              </button>
            </div>
          ) : (
            <div className="ag-ticket-table" dir={isRTL ? "rtl" : "ltr"}>
              <AgGridReact<Deposit>
                rowData={filteredDeposits}
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
      </div>

      {/* ── Add Card Modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={showCardModal} onClose={() => !addingCard && setShowCardModal(false)} className="max-w-md mx-4 w-full" showCloseButton={false}>
        <div dir={isRTL ? "rtl" : "ltr"}>
          <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-7">
            <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{t("addCard")}</h2>
                  <p className="text-xs text-white/70">{t("addCardDesc")}</p>
                </div>
              </div>
              <button onClick={() => !addingCard && setShowCardModal(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white/80 hover:bg-white/30 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleAddCard} className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("cardNumber")}</label>
              <input
                ref={cardNumberRef}
                dir="ltr"
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                placeholder={t("cardNumberPlaceholder")}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 tracking-widest"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("cardOwner")}</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder={t("cardOwnerPlaceholder")}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("bankName")}</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder={t("bankNamePlaceholder")}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800"
              />
            </div>
            <div className={`flex gap-3 pt-1 ${isRTL ? "flex-row-reverse" : ""}`}>
              <button type="submit" disabled={addingCard} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
                {addingCard ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>{t("saving")}</>
                ) : t("addCard")}
              </button>
              <button type="button" onClick={() => !addingCard && setShowCardModal(false)} disabled={addingCard} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ── New Deposit Modal ──────────────────────────────────────────────── */}
      <Modal isOpen={showDepositModal} onClose={() => !submittingDep && setShowDepositModal(false)} className="max-w-md mx-4 w-full" showCloseButton={false}>
        <div dir={isRTL ? "rtl" : "ltr"}>

          {/* ── Success screen ── */}
          {submittedCode ? (
            <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/10">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{t("depositSubmitted")}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("interceptionCodeHint")}</p>
              </div>
              <div className="w-full rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-5 py-4">
                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{t("interceptionCode")}</p>
                <p dir="ltr" className="font-mono text-xl font-bold tracking-widest text-gray-900 dark:text-white select-all">{submittedCode}</p>
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                {t("close")}
              </button>
            </div>
          ) : (
          <>
          <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-7">
            <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{t("newDeposit")}</h2>
                  <p className="text-xs text-white/70">{t("newDepositDesc")}</p>
                </div>
              </div>
              <button onClick={() => !submittingDep && setShowDepositModal(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white/80 hover:bg-white/30 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitDeposit} className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("depositCard")}</label>
              <select
                value={selCardId}
                onChange={(e) => setSelCardId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800"
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.bankName} — ****{c.cardNumber.slice(-4)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("depositAmount")}</label>
              <input
                ref={amountRef}
                type="number"
                min={1000}
                step={1000}
                value={depAmount}
                onChange={(e) => setDepAmount(e.target.value)}
                placeholder={t("depositAmountPlaceholder")}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("depositDescription")}</label>
              <textarea
                value={depDesc}
                onChange={(e) => setDepDesc(e.target.value)}
                placeholder={t("depositDescriptionPlaceholder")}
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-brand-500 dark:focus:bg-gray-800 resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("depositReceipt")}</label>
              <input ref={receiptFileRef} type="file" accept="image/*" className="hidden" onChange={handleReceiptSelect} />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => receiptFileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                  )}
                  {isRTL ? "انتخاب تصویر رسید" : "Attach receipt"}
                </button>
                {depReceipt && (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={depReceipt} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setDepReceipt("")} className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className={`flex gap-3 pt-1 ${isRTL ? "flex-row-reverse" : ""}`}>
              <button type="submit" disabled={submittingDep || uploading} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
                {submittingDep ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>{t("submitting")}</>
                ) : t("submitDeposit")}
              </button>
              <button type="button" onClick={() => !submittingDep && setShowDepositModal(false)} disabled={submittingDep} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                {t("cancel")}
              </button>
            </div>
          </form>
          </> )} {/* end !submittedCode */}
        </div>
      </Modal>
    </div>
  );
}
