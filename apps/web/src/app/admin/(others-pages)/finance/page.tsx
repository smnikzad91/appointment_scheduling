"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { Modal } from "@/components/ui/modal";
import AdminFinanceRequests from "@/components/admin/AdminFinanceRequests";

// The platform's bank cards for wallet top-ups. Each needs the bank's deposit SMS sender and
// template: payments are confirmed only by that SMS (apps/bank-sms-agent → /admin/bank-sms), never
// by hand-approved receipts.
type AdminCard = { id: string; cardNumber: string; ownerName: string; bankName: string; smsSender?: string | null; smsTemplate?: string | null };

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminFinancePage() {
  const t         = useT();
  const { lang }  = useLanguage();
  const isRTL     = lang === "fa";

  // Destination cards
  const [adminCards, setAdminCards]         = useState<AdminCard[]>([]);
  const [showCardModal, setShowCardModal]   = useState(false);
  const [cardForm, setCardForm]             = useState({ cardNumber: "", ownerName: "", bankName: "", smsSender: "", smsTemplate: "" });
  // editing an existing card's deposit SMS (null = adding a new card)
  const [smsCardId, setSmsCardId]           = useState<string | null>(null);
  const [smsSample, setSmsSample]           = useState("");
  const [smsTest, setSmsTest]               = useState<string | null>(null);
  const [addingCard, setAddingCard]         = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [copiedId, setCopiedId]             = useState<string | null>(null);

  const loadAdminCards = () => {
    fetch("/api/admin/finance/cards")
      .then((r) => r.json())
      .then((d) => setAdminCards(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  const openCardModal = () => {
    setCardForm({ cardNumber: "", ownerName: "", bankName: "", smsSender: "", smsTemplate: "" });
    setSmsCardId(null); setSmsSample(""); setSmsTest(null); setShowCardModal(true);
  };
  const openSmsModal = (card: AdminCard) => {
    setCardForm({ cardNumber: card.cardNumber, ownerName: card.ownerName, bankName: card.bankName, smsSender: card.smsSender ?? "", smsTemplate: card.smsTemplate ?? "" });
    setSmsCardId(card.id); setSmsSample(""); setSmsTest(null); setShowCardModal(true);
  };

  /** Try the template on the pasted SMS (the server parses it the same way as the device's SMS). */
  const handleTestTemplate = async () => {
    const res = await fetch("/api/admin/finance/cards/test", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: cardForm.smsTemplate, sms: smsSample }),
    });
    const d = await res.json();
    setSmsTest(d.ok
      ? `✓ ${t("templateMatches")}: ${Number(d.amountRial).toLocaleString()} rial` + (d.balanceRial ? ` · ${Number(d.balanceRial).toLocaleString()}` : "") + (d.card ? ` · ${d.card}` : "") + (d.date ? ` · ${d.date}` : "") + (d.time ? ` ${d.time}` : "")
      : `✗ ${d.error}`);
  };

  const handleAddCard = async () => {
    setAddingCard(true);
    const res = smsCardId
      ? await fetch(`/api/admin/finance/cards/${smsCardId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ smsSender: cardForm.smsSender, smsTemplate: cardForm.smsTemplate }),
        })
      : await fetch("/api/admin/finance/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cardForm),
        });
    const data = await res.json();
    setAddingCard(false);
    if (res.ok) {
      toast.success(smsCardId ? t("smsSettingsSaved") : t("adminCardAdded"));
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

  useEffect(() => { queueMicrotask(loadAdminCards); }, []);

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
                <div className="flex items-center gap-2">
                  {card.smsSender && card.smsTemplate && (
                    <span className="rounded-lg bg-white/25 px-2 py-0.5 text-[11px] font-medium">{t("autoConfirmOn")}</span>
                  )}
                  <button onClick={() => openSmsModal(card)} className="rounded-lg bg-white/20 hover:bg-white/30 px-2 py-0.5 text-[11px] font-medium transition-colors">
                    {t("editSmsSettings")}
                  </button>
                </div>
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

      <AdminFinanceRequests />

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
            {smsCardId ? (
              <p dir="ltr" className="font-mono text-sm text-gray-600 dark:text-gray-300">{formatCardNumber(cardForm.cardNumber)} · {cardForm.bankName}</p>
            ) : (<>
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
            </>)}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("smsSender")}</label>
              <textarea
                dir="ltr"
                rows={2}
                value={cardForm.smsSender}
                onChange={(e) => setCardForm((f) => ({ ...f, smsSender: e.target.value }))}
                placeholder={"B.Pasargad\n+98999…"}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("smsSenderHint")}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("smsTemplate")}</label>
              <textarea
                rows={5}
                value={cardForm.smsTemplate}
                onChange={(e) => { setCardForm((f) => ({ ...f, smsTemplate: e.target.value })); setSmsTest(null); }}
                placeholder={"بانک ملت\nواریز: {amount} ریال\nمانده: {balance}\n{date}-{time}"}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("smsTemplateHint")}</p>
            </div>
            {cardForm.smsTemplate && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("smsSample")}</label>
                <textarea
                  rows={4}
                  value={smsSample}
                  onChange={(e) => { setSmsSample(e.target.value); setSmsTest(null); }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-brand-500 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-colors"
                />
                <div className="mt-2 flex items-center gap-3">
                  <button onClick={handleTestTemplate} disabled={!smsSample} className="rounded-xl border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">
                    {t("testTemplate")}
                  </button>
                  {smsTest && <span className={`text-xs ${smsTest.startsWith("✓") ? "text-success-600" : "text-error-500"}`}>{smsTest}</span>}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAddCard}
              disabled={addingCard || !cardForm.smsSender.trim() || !cardForm.smsTemplate.trim() || (!smsCardId && (cardForm.cardNumber.length !== 16 || !cardForm.ownerName || !cardForm.bankName))}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {addingCard ? (
                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>{t("submitting")}</>
              ) : smsCardId ? t("saveSmsSettings") : t("addAdminCard")}
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
    </div>
  );
}
