"use client";

import { useState } from "react";
import { PageHeader } from "./ui";
import WalletTopUp from "./WalletTopUp";
import WalletHistory from "./WalletHistory";

// One wallet screen for every role: top-up (card-to-card confirmed by the bank SMS), balance,
// withdrawal to a Sheba, and the history. /dashboard/finance, /salon/wallet, /stylist/wallet.
export default function WalletScreen({ subtitle }: { subtitle: string }) {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div className="space-y-4">
      <PageHeader title="کیف پول" subtitle={subtitle} />
      <WalletTopUp onPaid={() => setReloadKey((k) => k + 1)} />
      <WalletHistory reloadKey={reloadKey} title="موجودی" />
    </div>
  );
}
