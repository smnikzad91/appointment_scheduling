"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { Card, EmptyState, ErrorBanner, ListGroup, ListSkeleton, SectionTitle } from "./ui";
import { formatSalonDate, formatSalonDateTime } from "@/lib/salonTime";
import { toPersianDigits } from "@/lib/persian";

// Wallet balance and its movements (GET /api/user/finance/wallet): top-ups, booking pre-payments
// and refunds for a customer; pre-payments received (and any taken back) for a salon owner.

export type WalletTxKind = "top_up" | "prepayment" | "prepayment_refund" | "prepayment_income" | "prepayment_income_reversal";

interface WalletTx {
  id: string;
  kind: WalletTxKind;
  amountToman: number;
  balanceAfter: number;
  createdAt: string;
  appointment: { startAt: string; salonName: string; timezone: string } | null;
}

const KIND_LABEL: Record<WalletTxKind, string> = {
  top_up: "شارژ کیف پول",
  prepayment: "پیش‌پرداخت نوبت",
  prepayment_refund: "بازگشت پیش‌پرداخت (لغو نوبت)",
  prepayment_income: "پیش‌پرداخت دریافتی نوبت",
  prepayment_income_reversal: "برگشت پیش‌پرداخت دریافتی",
};

const fa = (n: number) => toPersianDigits(Math.abs(n).toLocaleString("en-US").replace(/,/g, "٬"));

export default function WalletHistory({ reloadKey = 0, title = "کیف پول" }: { reloadKey?: number; title?: string }) {
  const [data, setData] = useState<{ balanceToman: number; items: WalletTx[] } | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    fetch("/api/user/finance/wallet")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load, reloadKey]);

  if (failed) return <ErrorBanner onRetry={load}>کیف پول بارگذاری نشد.</ErrorBanner>;
  if (!data) return <ListSkeleton rows={3} />;

  // A negative balance only happens to an owner whose mistaken «انجام شد» was undone after spending.
  const negative = data.balanceToman < 0;
  return (
    <div className="space-y-3">
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-app-muted">{title}</p>
          <p className={`mt-1 text-2xl font-black ${negative ? "text-app-danger" : "text-app-ink"}`}>
            {fa(data.balanceToman)} <span className="text-sm font-normal text-app-muted">تومان</span>
          </p>
          {negative && <p className="text-xs text-app-danger">بدهی به کیف پول</p>}
        </div>
        <Wallet className="h-8 w-8 text-app-accent" />
      </Card>

      <SectionTitle>گردش کیف پول</SectionTitle>
      {data.items.length === 0 ? (
        <EmptyState icon={Wallet} title="هنوز گردشی ندارید" />
      ) : (
        <ListGroup>
          {data.items.map((t) => {
            const credit = t.amountToman > 0;
            const Icon = credit ? ArrowDownLeft : ArrowUpRight;
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                {/* no +/− sign next to a Persian amount (it drifts in RTL): the arrow and colour say it */}
                <Icon className={`h-5 w-5 shrink-0 ${credit ? "text-app-done" : "text-app-danger"}`} aria-label={credit ? "واریز" : "برداشت"} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-app-ink">{KIND_LABEL[t.kind] ?? t.kind}</p>
                  <p className="text-xs text-app-muted">
                    {t.appointment ? `${t.appointment.salonName}، نوبت ${formatSalonDateTime(t.appointment.startAt, t.appointment.timezone)}` : formatSalonDate(t.createdAt)}
                  </p>
                </div>
                <div className="text-end">
                  <p className={`text-sm font-bold ${credit ? "text-app-done" : "text-app-danger"}`}>
                    {fa(t.amountToman)}
                  </p>
                  <p className="text-[11px] text-app-muted">مانده {fa(t.balanceAfter)}</p>
                </div>
              </div>
            );
          })}
        </ListGroup>
      )}
    </div>
  );
}
