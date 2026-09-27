"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

// Stylists added before commissions existed (or invited with 0%) earn nothing in the books: the
// whole amount of their appointments counts as the salon's share and no balance builds up. This
// card makes that visible until the owner sets a share — or says 0% is intended (e.g. a stylist
// on a fixed salary), which is remembered per stylist on this device.

const OK_KEY = "zero-commission-ok";

function readOk(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(OK_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

interface StylistLike {
  id: string;
  displayName: string;
  commissionPercent: number;
  active: boolean;
}

export default function ZeroCommissionNotice({
  stylists,
  onPick,
  className = "",
}: {
  stylists: StylistLike[];
  /** Open this stylist's sheet in place; without it each name links to the stylists page. */
  onPick?: (id: string) => void;
  className?: string;
}) {
  const [ok, setOk] = useState<string[]>(() => (typeof window === "undefined" ? [] : readOk()));
  const zero = stylists.filter((s) => s.active && s.commissionPercent === 0 && !ok.includes(s.id));
  if (zero.length === 0) return null;

  function intended() {
    const next = [...new Set([...ok, ...zero.map((s) => s.id)])];
    try {
      localStorage.setItem(OK_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked — hide it for this visit only.
    }
    setOk(next);
  }

  const names = zero.map((s) => s.displayName).join("، ");
  const chip = "inline-flex h-9 items-center rounded-full bg-app-pending px-3.5 text-[13px] font-bold text-white active:scale-95";
  return (
    <div role="status" className={`rounded-3xl border border-app-pending/30 bg-app-pending/10 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-app-pending" aria-hidden />
        <div className="min-w-0">
          <p className="font-black text-app-ink">
            {zero.length === 1 ? `سهم ${names} تعیین نشده (۰٪)` : `سهم این آرایشگرها تعیین نشده (۰٪): ${names}`}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-app-muted">
            تا سهم را تعیین نکنید، کل مبلغ نوبت‌هایشان سهم سالن حساب می‌شود و طلبی برایشان ثبت نمی‌شود.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {zero.map((s) =>
          onPick ? (
            <button key={s.id} type="button" onClick={() => onPick(s.id)} className={chip}>
              تعیین سهم {s.displayName}
            </button>
          ) : (
            <Link key={s.id} href={`/salon/stylists?stylist=${s.id}`} className={chip}>
              تعیین سهم {s.displayName}
            </Link>
          ),
        )}
        <button type="button" onClick={intended} className="h-9 rounded-full px-3 text-[13px] font-bold text-app-muted active:bg-app-card-2">
          عمداً ۰٪ است
        </button>
      </div>
    </div>
  );
}
