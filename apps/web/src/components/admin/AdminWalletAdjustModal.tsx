"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";
import type { TranslationKey } from "@/i18n/translations";
import { MAX_ADJUSTMENT_NOTE, parseToman } from "@/lib/walletAdjustment";

// /admin/users: add to or take from one user's wallet (POST /api/admin/users/:id/wallet), e.g. when
// a card payment came without the top-up's last rials and so wasn't confirmed automatically. The
// reason is shown to the user in their wallet history; by default they also get an SMS with the
// amount and the new balance.

const ERRORS: Record<string, TranslationKey> = {
  "Not enough wallet balance": "walletAdjustErrShort",
  "Invalid amount": "walletAdjustErrAmount",
  "Amount too large": "walletAdjustErrLarge",
  "A reason is required": "walletAdjustErrNote",
  "Reason too long": "walletAdjustErrNote",
  "This account is closed": "walletAdjustErrClosed",
};

export interface WalletAdjustTarget {
  id: string;
  name: string;
  walletBalance: number;
}

export default function AdminWalletAdjustModal({ target, onClose, onDone }: { target: WalletAdjustTarget | null; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const { num } = useLocaleFormat();
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const money = (n: number) => num(n.toLocaleString("en-US"));
  const parsed = parseToman(amount);
  const valid = Number.isSafeInteger(parsed) && parsed > 0;
  const after = target && valid ? target.walletBalance + (direction === "credit" ? parsed : -parsed) : null;

  const close = () => {
    if (saving) return;
    setDirection("credit");
    setAmount("");
    setNote("");
    setNotify(true);
    setError("");
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    if (!valid) return setError(t("walletAdjustErrAmount"));
    if (!note.trim()) return setError(t("walletAdjustErrNote"));
    if (after !== null && after < 0) return setError(t("walletAdjustErrShort"));
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/users/${target.id}/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, amountToman: parsed, note, notify }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const data = await res?.json().catch(() => ({}));
      const key = typeof data?.error === "string" ? ERRORS[data.error] : undefined;
      setError(t(key ?? "userErrGeneric"));
      return;
    }
    const done = await res.json().catch(() => ({}));
    toast.success(t(done?.sms ? "walletAdjustDoneSms" : "walletAdjustDone"));
    setNotify(true);
    setAmount("");
    setNote("");
    setDirection("credit");
    onDone();
    onClose();
  };

  const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white";
  const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1";
  const tab = (active: boolean, tone: "green" | "red") =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
      active
        ? tone === "green" ? "bg-green-600 text-white" : "bg-red-500 text-white"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
    }`;

  return (
    <Modal isOpen={!!target} onClose={close} showCloseButton={false} className="max-w-sm mx-4">
      <form onSubmit={submit} className="p-6 sm:p-8 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t("walletAdjust")}</h3>
          {target && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{target.name}</p>}
        </div>

        {target && (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-sm dark:bg-gray-800">
            <span className="text-gray-500 dark:text-gray-400">{t("walletAdjustCurrent")}</span>
            <span className={`font-bold ${target.walletBalance < 0 ? "text-red-500" : "text-gray-900 dark:text-white"}`}>
              {money(target.walletBalance)} {t("userWalletUnit")}
            </span>
          </div>
        )}

        <div className="flex gap-1 rounded-xl border border-gray-200 p-1 dark:border-gray-700" role="radiogroup">
          <button type="button" role="radio" aria-checked={direction === "credit"} className={tab(direction === "credit", "green")} onClick={() => setDirection("credit")}>
            {t("walletAdjustCredit")}
          </button>
          <button type="button" role="radio" aria-checked={direction === "debit"} className={tab(direction === "debit", "red")} onClick={() => setDirection("debit")}>
            {t("walletAdjustDebit")}
          </button>
        </div>

        <div>
          <label className={labelClass} htmlFor="wallet-adjust-amount">{t("walletAdjustAmount")}</label>
          <input
            id="wallet-adjust-amount"
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="500,000"
            className={inputClass}
            dir="ltr"
          />
          {valid && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{money(parsed)} {t("userWalletUnit")}</p>}
        </div>

        <div>
          <label className={labelClass} htmlFor="wallet-adjust-note">{t("walletAdjustNote")}</label>
          <textarea
            id="wallet-adjust-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_ADJUSTMENT_NOTE}
            rows={2}
            placeholder={t("walletAdjustNotePlaceholder")}
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 rounded accent-brand-500" />
          {t("walletAdjustNotify")}
        </label>

        {after !== null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t("walletAdjustAfter")}</span>
            <span className={`font-bold ${after < 0 ? "text-red-500" : direction === "credit" ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}`}>
              {money(after)} {t("userWalletUnit")}
            </span>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={close}
            disabled={saving}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {t("userCancel")}
          </button>
          <button
            type="submit"
            disabled={saving || !valid || !note.trim()}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${direction === "credit" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"}`}
          >
            {saving ? t("walletAdjustSaving") : t("walletAdjustSave")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
