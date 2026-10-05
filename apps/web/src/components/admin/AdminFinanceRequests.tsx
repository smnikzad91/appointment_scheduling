"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/i18n/useT";
import AdminTopUpsTable, { type TopUpRow } from "./AdminTopUpsTable";
import AdminWithdrawals from "./AdminWithdrawals";

// /admin/finance tabs: «درخواست‌های افزایش موجودی» (wallet top-ups) and «درخواست‌های برداشت»
// (withdrawals to pay). The tab is in the URL hash (#top-ups / #withdrawals) so links can open one.

type Tab = "top-ups" | "withdrawals";

export default function AdminFinanceRequests() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("top-ups");
  const [topUps, setTopUps] = useState<TopUpRow[] | undefined>(undefined);

  useEffect(() => {
    const fromHash = () => setTab(window.location.hash === "#withdrawals" ? "withdrawals" : "top-ups");
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  const loadTopUps = useCallback(() => {
    fetch("/api/admin/finance/top-ups").then((r) => (r.ok ? r.json() : [])).then(setTopUps).catch(() => setTopUps([]));
  }, []);
  useEffect(() => {
    if (tab !== "top-ups") return;
    loadTopUps();
    const timer = setInterval(loadTopUps, 30_000);
    return () => clearInterval(timer);
  }, [tab, loadTopUps]);

  const choose = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
  };

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {([["top-ups", t("bankSmsTopUps")], ["withdrawals", t("withdrawalsTitle")]] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => choose(key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key ? "border-brand-500 text-brand-600 dark:text-brand-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "top-ups" ? <AdminTopUpsTable rows={topUps} /> : <AdminWithdrawals />}
    </div>
  );
}
