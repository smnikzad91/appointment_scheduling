"use client";

import { useState } from "react";
import { PageHeader } from "@/components/app/ui";
import WalletTopUp from "@/components/app/WalletTopUp";
import WalletHistory from "@/components/app/WalletHistory";

// «کیف پول»: balance, automatic top-up (card-to-card confirmed by the bank SMS — the only way in)
// and the history. Booking pre-payments are paid only from this balance.
export default function FinancePage() {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div className="space-y-4">
      <PageHeader title="کیف پول" subtitle="پیش‌پرداخت نوبت‌ها فقط از موجودی کیف پول پرداخت می‌شود." />
      <WalletTopUp onPaid={() => setReloadKey((k) => k + 1)} />
      <WalletHistory reloadKey={reloadKey} title="موجودی" />
    </div>
  );
}
