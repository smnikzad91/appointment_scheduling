"use client";

import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import AdminFinanceRequests from "@/components/admin/AdminFinanceRequests";

// Wallet top-ups (made and confirmed through nodepass.ir — its cards, deposit SMS and unmatched
// deposits are managed in nodepass's own admin) and withdrawals to pay.
export default function AdminFinancePage() {
  const t        = useT();
  const { lang } = useLanguage();

  return (
    <div className="space-y-6" dir={lang === "fa" ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("adminFinanceTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("adminFinanceDesc")}</p>
      </div>
      <AdminFinanceRequests />
    </div>
  );
}
