"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronLeft, Eye, Lightbulb, UsersRound } from "lucide-react";
import { getCustomerInsights, getVisitInsights, type CustomerInsights, type VisitInsights } from "@/lib/api/insights";
import { change, faNum, faPct } from "./charts";
import { cx } from "../ui";

// The owner home's two analytics shortcuts: «آمار بازدید» (last 7 days' visitors with a mini trend
// and the visit → booking conversion) and «رفتار مشتری» (returning share and the top takeaway).
// Each card opens its full page; if the numbers can't load the cards still link there.

function Shell({ href, icon: Icon, title, children, loading }: { href: string; icon: typeof Eye; title: string; children?: React.ReactNode; loading?: boolean }) {
  return (
    <Link
      href={href}
      className="group relative flex min-h-[148px] flex-col overflow-hidden rounded-3xl border border-app-line bg-app-card p-4 shadow-app transition active:scale-[0.99]"
    >
      {/* a soft metallic sheen in the corner */}
      <span className="pointer-events-none absolute -end-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-app-accent/25 to-transparent blur-xl" aria-hidden />
      <span className="relative flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="flex-1 text-sm font-bold text-app-ink">{title}</span>
        <ChevronLeft className="h-4 w-4 text-app-muted transition group-hover:-translate-x-0.5" aria-hidden />
      </span>
      <div className={cx("relative mt-3 flex flex-1 flex-col", loading && "animate-pulse")}>
        {loading ? (
          <>
            <span className="h-7 w-16 rounded-lg bg-app-card-2" />
            <span className="mt-auto h-8 rounded-lg bg-app-card-2" />
          </>
        ) : (
          children
        )}
      </div>
    </Link>
  );
}

export default function InsightsHomeCards({ token, className }: { token: string | null; className?: string }) {
  const [visits, setVisits] = useState<VisitInsights | null | "error">(null);
  const [customers, setCustomers] = useState<CustomerInsights | null | "error">(null);

  useEffect(() => {
    if (!token) return;
    getVisitInsights(token, 7).then(setVisits).catch(() => setVisits("error"));
    getCustomerInsights(token, 30).then(setCustomers).catch(() => setCustomers("error"));
  }, [token]);

  const v = visits !== "error" ? visits : null;
  const c = customers !== "error" ? customers : null;
  const delta = v ? change(v.totals.visitors, v.previous.visitors) : null;
  const max = v ? Math.max(1, ...v.perDay.map((d) => d.visitors)) : 1;
  const tip = c?.tips.find((t) => t.tone === "warn") ?? c?.tips[0];

  return (
    <div className={cx("grid grid-cols-2 gap-2.5", className)}>
      <Shell href="/salon/insights/visits" icon={Eye} title="آمار بازدید" loading={visits === null}>
        {visits === "error" || !v ? (
          <p className="text-xs leading-5 text-app-muted">بازدید صفحه رزرو و نرخ تبدیل به نوبت</p>
        ) : (
          <>
            <p className="text-[26px] font-black leading-none text-app-ink">
              {faNum(v.totals.visitors)}
              <span className="ms-1 text-xs font-medium text-app-muted">نفر در ۷ روز</span>
            </p>
            {delta !== null && (
              <p className={cx("mt-1 text-[11px] font-bold", delta >= 0 ? "text-app-done" : "text-app-danger")}>
                {delta >= 0 ? "▲" : "▼"} {faPct(Math.abs(delta))}
              </p>
            )}
            <div className="mt-auto flex h-8 items-end gap-[3px] pt-2" aria-hidden>
              {v.perDay.map((d, i) => (
                <span
                  key={d.day}
                  className={cx("flex-1 rounded-t-sm", i === v.perDay.length - 1 ? "bg-app-accent" : "bg-app-accent/40")}
                  style={{ height: d.visitors ? `${Math.max(12, (d.visitors / max) * 100)}%` : 2 }}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-app-muted">تبدیل به نوبت {faPct(v.conversion)}</p>
          </>
        )}
      </Shell>

      <Shell href="/salon/insights/customers" icon={UsersRound} title="رفتار مشتری" loading={customers === null}>
        {customers === "error" || !c || c.totals.bookings === 0 ? (
          <p className="text-xs leading-5 text-app-muted">ساعت‌های شلوغ، خدمات پرطرفدار و مشتری‌های وفادار</p>
        ) : (
          <>
            <p className="text-[26px] font-black leading-none text-app-ink">
              {faPct(c.customers.total ? Math.round((c.customers.returning / c.customers.total) * 100) : 0)}
              <span className="ms-1 text-xs font-medium text-app-muted">مشتری قدیمی</span>
            </p>
            <p className="mt-1 text-[11px] text-app-muted">{faNum(c.customers.total)} مشتری در ۳۰ روز</p>
            {tip ? (
              <p className="mt-auto flex items-start gap-1.5 pt-2 text-[11px] leading-5 text-app-ink">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-accent" aria-hidden />
                <span className="line-clamp-2">{tip.text}</span>
              </p>
            ) : (
              <p className="mt-auto flex items-center gap-1.5 pt-2 text-[11px] text-app-muted">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden /> نمودارها و جزئیات
              </p>
            )}
          </>
        )}
      </Shell>
    </div>
  );
}
