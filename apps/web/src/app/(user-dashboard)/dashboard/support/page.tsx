"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz, type ColDef } from "ag-grid-community";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { Modal } from "@/components/ui/modal";
import { EyeIcon, PaperPlaneIcon } from "@/icons";

type Ticket = {
  id: string;
  subject: string;
  status: "open" | "answered" | "closed";
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  lastReply: { sender: "user" | "admin" } | null;
};

type GridCtx = { isRTL: boolean; navigate: (id: string) => void; viewLabel: string };

// ── Themes ────────────────────────────────────────────────────────────────────
const agLight = themeQuartz.withParams({
  accentColor:                    "#465fff",
  backgroundColor:                "#ffffff",
  foregroundColor:                "#111827",   // gray-900
  borderColor:                    "#e5e7eb",   // gray-200
  chromeBackgroundColor:          "#f9fafb",   // gray-50  — header row bg
  headerTextColor:                "#6b7280",   // gray-500
  rowHoverColor:                  "#f9fafb",   // gray-50
  columnBorder:                   false,
  rowBorder:                      { color: "#f3f4f6" },  // gray-100
  fontSize:                       14,
  fontFamily:                     "inherit",
  rowVerticalPaddingScale:        1.3,
  headerFontSize:                 12,
});

const agDark = themeQuartz.withParams({
  accentColor:                    "#465fff",
  backgroundColor:                "#111827",   // gray-900
  foregroundColor:                "#f9fafb",   // gray-50
  borderColor:                    "#374151",   // gray-700
  chromeBackgroundColor:          "#111827",   // same as body — no chrome distinction
  headerTextColor:                "#9ca3af",   // gray-400
  rowHoverColor:                  "rgba(255,255,255,0.02)",
  columnBorder:                   false,
  rowBorder:                      { color: "#1f2937" },  // gray-800
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
  if (value.sender === "admin") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:bg-green-500/10 dark:text-green-400">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        {context.isRTL ? "پاسخ جدید از پشتیبانی" : "Admin replied"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      {context.isRTL ? "منتظر پاسخ پشتیبانی" : "Awaiting reply"}
    </span>
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
export default function SupportPage() {
  const t        = useT();
  const { lang } = useLanguage();
  const isRTL    = lang === "fa";
  const { theme } = useTheme();
  const router   = useRouter();

  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [subject, setSubject]       = useState("");
  const [message, setMessage]       = useState("");
  const [images, setImages]         = useState<string[]>([]);
  const [uploading, setUploading]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const subjectRef  = useRef<HTMLInputElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/user/tickets")
      .then((r) => r.json())
      .then((d) => setTickets(Array.isArray(d) ? d : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { queueMicrotask(load); }, []);

  const openModal  = () => { setSubject(""); setMessage(""); setImages([]); setShowModal(true); setTimeout(() => subjectRef.current?.focus(), 80); };
  const closeModal = () => { if (!submitting) setShowModal(false); };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (images.length + files.length > 5) { toast.error(isRTL ? "حداکثر ۵ تصویر مجاز است" : "Max 5 images allowed"); return; }
    setUploading(true);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setImages((prev) => [...prev, data.url]);
      else toast.error(data.error || (isRTL ? "خطا در آپلود" : "Upload failed"));
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res  = await fetch("/api/user/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message, images }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) { toast.success(t("ticketCreated")); setShowModal(false); load(); }
    else        { toast.error(data.error || t("saveError")); }
  };

  const gridContext = useMemo<GridCtx>(() => ({
    isRTL,
    navigate:  (id) => router.push(`/dashboard/support/${id}`),
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
      width: 110,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("supportTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("supportDesc")}</p>
        </div>
        <button
          onClick={openModal}
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t("newTicket")}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">{t("loading")}</div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-14">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("noTickets")}</p>
            <button onClick={openModal} className="mt-1 text-sm font-medium text-brand-500 hover:underline">
              {t("newTicket")} →
            </button>
          </div>
        ) : (
          <div className="ag-ticket-table" dir={isRTL ? "rtl" : "ltr"}>
          <AgGridReact<Ticket>
            rowData={tickets}
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

      {/* New ticket modal */}
      <Modal isOpen={showModal} onClose={closeModal} className="max-w-2xl mx-4 w-full" showCloseButton={false}>
        <div dir={isRTL ? "rtl" : "ltr"}>
          <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-8">
            <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{t("newTicket")}</h2>
                  <p className="mt-0.5 text-sm text-white/70">{t("supportDesc")}</p>
                </div>
              </div>
              <button onClick={closeModal} className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white/80 hover:bg-white/30 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("ticketSubject")}</label>
              <div className="relative">
                <div className={`pointer-events-none absolute inset-y-0 flex items-center ${isRTL ? "right-0 pr-3.5" : "left-0 pl-3.5"}`}>
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <input
                  ref={subjectRef}
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("ticketSubjectPlaceholder")}
                  maxLength={200}
                  className={`w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-500 dark:focus:bg-gray-800 ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"}`}
                />
              </div>
              <p className={`mt-1 text-xs text-gray-400 ${isRTL ? "text-left" : "text-right"}`}>{subject.length}/200</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("ticketMessage")}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("ticketMessagePlaceholder")}
                rows={7}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-brand-500 dark:focus:bg-gray-800 resize-none"
              />
              <p className={`mt-1 text-xs text-gray-400 ${isRTL ? "text-left" : "text-right"}`}>{message.length}/3000</p>
            </div>

            {/* Image attachments */}
            <div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || images.length >= 5}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                )}
                {isRTL ? `پیوست تصویر (${images.length}/5)` : `Attach images (${images.length}/5)`}
              </button>
              {images.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {images.map((url, i) => (
                    <div key={i} className="relative group h-16 w-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`flex gap-3 pt-1 ${isRTL ? "flex-row-reverse" : ""}`}>
              <button type="submit" disabled={submitting} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors">
                {submitting ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>{t("submitting")}</>
                ) : (
                  <><PaperPlaneIcon className="w-4 h-4" />{t("submitTicket")}</>
                )}
              </button>
              <button type="button" onClick={closeModal} disabled={submitting} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
