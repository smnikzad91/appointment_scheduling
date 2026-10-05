"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";

interface Overview {
  salons: { pending: number; active: number; suspended: number } | null;
  users: number;
  customers: number;
  openTickets: number;
  unmatchedBankSms: number;
  pendingWithdrawals: number;
  negativeWallets: number;
}

/** Platform-wide counts at the top of /admin; tiles that need action link to the page that handles it. */
export default function AdminOverview() {
  const t = useT();
  const { lang } = useLanguage();
  const [data, setData] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  const fmt = (n: number | undefined) => (n === undefined ? "—" : n.toLocaleString(lang === "fa" ? "fa-IR" : "en-US"));

  const tiles: { label: string; value: number | undefined; href: string; alert?: boolean }[] = [
    { label: t("overviewPendingSalons"), value: data?.salons?.pending, href: "/admin/salons", alert: !!data?.salons?.pending },
    { label: t("overviewActiveSalons"), value: data?.salons?.active, href: "/admin/salons" },
    { label: t("overviewCustomers"), value: data?.customers, href: "/admin/users" },
    { label: t("overviewOpenTickets"), value: data?.openTickets, href: "/admin/tickets", alert: !!data?.openTickets },
    { label: t("overviewUnmatchedBankSms"), value: data?.unmatchedBankSms, href: "/admin/bank-sms", alert: !!data?.unmatchedBankSms },
    { label: t("overviewPendingWithdrawals"), value: data?.pendingWithdrawals, href: "/admin/finance#withdrawals", alert: !!data?.pendingWithdrawals },
    { label: t("overviewNegativeWallets"), value: data?.negativeWallets, href: "/admin/users", alert: !!data?.negativeWallets },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("overviewTitle")}</h2>
      {failed ? (
        <p className="mt-4 text-sm text-red-500">{t("overviewLoadFailed")}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tiles.map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className={`rounded-xl border p-4 transition-colors ${
                tile.alert
                  ? "border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10"
                  : "border-gray-100 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/40 dark:hover:bg-gray-800"
              }`}
            >
              <p className={`text-2xl font-bold ${tile.alert ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`}>
                {data ? fmt(tile.value) : "…"}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tile.label}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
