"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Wallet } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { PAYOUT_METHOD_LABEL, getMyEarnings, type StylistEarnings } from "@/lib/api/accounting";
import { jalaliMonthPeriod } from "@/lib/accountingPeriod";
import { formatToman, toPersianDigits } from "@/lib/persian";
import Sep from "@/components/common/Sep";
import { HeroAmount, PeriodSwitcher, shortDate } from "@/components/app/accounting";
import { EmptyState, ErrorBanner, ListSkeleton, PageHeader, SectionTitle, cx, riseStyle } from "@/components/app/ui";

export default function StylistEarningsPage() {
  const token = useApiAccessToken();
  const [offset, setOffset] = useState(0);
  const period = useMemo(() => jalaliMonthPeriod(offset), [offset]);
  const [state, setState] = useState<{ from: string; data: StylistEarnings } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getMyEarnings(token, { from: period.from, to: period.to })
      .then((data) => {
        if (cancelled) return;
        setError(null);
        setState({ from: period.from, data });
      })
      .catch(() => !cancelled && setError("دریافت درآمد انجام نشد"));
    return () => {
      cancelled = true;
    };
  }, [token, period, retry]);

  const data = state?.data ?? null;
  const loading = state?.from !== period.from;

  return (
    <>
      <PageHeader title="درآمد من" subtitle={data ? `سهم شما از هر نوبت: ${toPersianDigits(data.stylist.commissionPercent)}٪` : undefined} />
      <PeriodSwitcher period={period} onChange={setOffset} />
      {error && <ErrorBanner onRetry={() => setRetry((r) => r + 1)}>{error}</ErrorBanner>}

      {!data ? (
        !error && <ListSkeleton rows={3} />
      ) : (
        <div className={cx("transition-opacity", loading && "opacity-60")}>
          <section className="rounded-[32px] bg-[#2a1d26] p-5 text-[#f8f1e9] shadow-app dark:bg-[#33232f] dark:ring-1 dark:ring-app-line">
            <p className="text-xs text-white/60">سهم شما در {period.label}</p>
            <p className="mt-1 text-[30px] font-black leading-tight">{formatToman(data.totals.shareToman)}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 rounded-3xl bg-white/[0.06] p-4">
              <div className="min-w-0">
                <p className="text-[11px] text-white/55">نوبت انجام‌شده</p>
                <p className="text-[15px] font-black">{toPersianDigits(data.totals.appointmentCount)}</p>
              </div>
              <HeroAmount label="مبلغ نوبت‌ها" amount={data.totals.incomeToman} />
              <HeroAmount label="دریافتی" amount={data.totals.paidInPeriodToman} />
            </div>
          </section>

          <div
            className={cx(
              "mt-3 flex items-center gap-3 rounded-3xl p-4",
              data.balanceToman > 0 ? "bg-app-pending/12 text-app-pending" : data.balanceToman < 0 ? "bg-app-card-2 text-app-muted" : "bg-app-done/10 text-app-done",
            )}
          >
            <Banknote className="h-6 w-6 shrink-0" aria-hidden />
            <p className="text-sm font-bold leading-6">
              {data.balanceToman > 0
                ? `مانده طلب شما از سالن: ${formatToman(data.balanceToman)}`
                : data.balanceToman < 0
                  ? `پیش‌دریافت: ${formatToman(-data.balanceToman)} بیشتر از سهمتان دریافت کرده‌اید`
                  : "حساب شما با سالن تسویه است"}
            </p>
          </div>

          <SectionTitle>نوبت‌های انجام‌شده</SectionTitle>
          {data.items.length === 0 ? (
            <EmptyState icon={Wallet} title="در این ماه نوبت انجام‌شده‌ای ندارید" />
          ) : (
            <div className="flex flex-col gap-2">
              {data.items.map((item, i) => (
                <div key={item.id} style={riseStyle(i)} className="app-rise rounded-3xl border border-app-line bg-app-card px-4 py-3 shadow-app">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-app-ink">{item.services.join("، ")}</p>
                      <p className="truncate text-xs text-app-muted">
                        {shortDate(item.startAt)}
                        <Sep />
                        {item.customerName}
                      </p>
                    </div>
                    <div className="shrink-0 text-end">
                      <p className="font-black text-app-accent">{formatToman(item.stylistShareToman)}</p>
                      <p className="text-[11px] text-app-muted">
                        {toPersianDigits(item.commissionPercent)}٪ از {formatToman(item.chargedToman)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <SectionTitle>پرداخت‌های سالن به شما</SectionTitle>
          {data.payouts.length === 0 ? (
            <p className="rounded-2xl bg-app-card-2 p-4 text-sm text-app-muted">در این ماه پرداختی ثبت نشده است.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-3xl border border-app-line bg-app-card px-4 py-3 shadow-app">
                  <div className="min-w-0">
                    <p className="font-bold text-app-ink">{formatToman(p.amountToman)}</p>
                    <p className="truncate text-xs text-app-muted">
                      {shortDate(p.paidAt)}
                      <Sep />
                      {PAYOUT_METHOD_LABEL[p.method]}
                      {p.note && (
                        <>
                          <Sep />
                          {p.note}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
