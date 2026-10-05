"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Wallet } from "lucide-react";
import { formatToman } from "@/lib/persian";
import { cx } from "./ui";

// Home-screen shortcut to the wallet with its balance (GET /api/user/profile → walletBalance) —
// salon and stylist homes (the customer home has its own wallet card). A negative balance (an undone completion after the money was
// spent) is shown as a debt that the next income pays off.
export default function WalletBalanceCard({ href, className }: { href: string; className?: string }) {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => typeof d?.walletBalance === "number" && setBalance(d.walletBalance))
      .catch(() => {});
  }, []);

  if (balance === null) return null;
  const debt = balance < 0;
  return (
    <Link href={href} className={cx("flex items-center gap-3 rounded-3xl border border-app-line bg-app-card p-4 shadow-app active:scale-[0.99]", className)}>
      <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", debt ? "bg-app-danger/12 text-app-danger" : "bg-app-accent-soft text-app-accent")}>
        <Wallet className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-app-muted">{debt ? "بدهی کیف پول" : "موجودی کیف پول"}</span>
        {/* no minus sign next to a Persian amount: «بدهی» says it */}
        <span className={cx("block text-lg font-black", debt ? "text-app-danger" : "text-app-ink")}>{formatToman(Math.abs(balance))}</span>
      </span>
      <ChevronLeft className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />
    </Link>
  );
}
