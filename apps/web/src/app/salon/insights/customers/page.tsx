"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarX2, Lightbulb, Sparkles, ThumbsUp, Users } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { CUSTOMER_RANGES, getCustomerInsights, type CustomerInsights, type CustomerRange } from "@/lib/api/insights";
import { Bars, Heatmap, Kpi, Meters, Panel, RangeTabs, faNum, faPct } from "@/components/app/insights/charts";
import { WEEKDAYS_FA, durationLabel } from "@/components/app/insights/labels";
import { formatSalonDate } from "@/lib/salonTime";
import { formatToman, toPersianDigits } from "@/lib/persian";
import { EmptyState, ErrorBanner, ListGroup, ListSkeleton, PageHeader, cx } from "@/components/app/ui";
import Sep from "@/components/common/Sep";

// «آنالیز رفتار مشتری»: the owner's past bookings (apps/api insights/customer-insights.ts) — when
// customers book (weekday × hour), which services sell and earn, new vs returning customers, how far
// ahead they book, cancellations and no-shows, monthly retention cohorts and plain-Persian takeaways.

const WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const TIP_STYLE = {
  good: { icon: ThumbsUp, className: "bg-app-done/12 text-app-done" },
  warn: { icon: AlertTriangle, className: "bg-app-pending/12 text-app-pending" },
  info: { icon: Lightbulb, className: "bg-app-accent-soft text-app-accent" },
} as const;

export default function SalonCustomerInsightsPage() {
  const token = useApiAccessToken();
  const [days, setDays] = useState<CustomerRange>(90);
  const [data, setData] = useState<CustomerInsights | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getCustomerInsights(token, days)
      .then((d) => !cancelled && (setData(d), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [token, days, retry]);

  const header = (
    <PageHeader
      title="آنالیز رفتار مشتری"
      subtitle="الگوی نوبت‌ها، خدمات پرطرفدار و وفاداری مشتری‌ها"
      action={
        <Link href="/salon" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-app-line bg-app-card text-app-ink" aria-label="بازگشت به خانه">
          <ArrowRight className="h-5 w-5" />
        </Link>
      }
    />
  );

  if (failed && !data) return <>{header}<ErrorBanner onRetry={() => setRetry((n) => n + 1)}>آنالیز مشتری‌ها دریافت نشد.</ErrorBanner></>;
  if (!data) return <>{header}<ListSkeleton rows={4} /></>;

  const t = data.totals;
  const c = data.customers;
  const lead = data.leadTime.buckets;
  const leadTotal = lead.sameDay + lead.upTo3Days + lead.upTo7Days + lead.moreThan7Days;
  const openHours = data.byHour.map((n, h) => (n ? h : -1)).filter((h) => h >= 0);
  const hourSpan = openHours.length ? Array.from({ length: openHours[openHours.length - 1] - openHours[0] + 1 }, (_, i) => openHours[0] + i) : [];
  const hasCohorts = data.cohorts.some((m) => m.customers > 0);

  return (
    <div className="space-y-3">
      {header}
      <RangeTabs options={CUSTOMER_RANGES} value={days} onChange={setDays} />

      {t.bookings === 0 ? (
        <EmptyState icon={CalendarX2} title="در این بازه نوبتی نبوده" hint="با چند نوبت ثبت‌شده، الگوی مشتری‌هایتان اینجا نمایش داده می‌شود." />
      ) : (
        <>
          {data.tips.length > 0 && (
            <Panel title="نکته‌های کلیدی" hint="خلاصه‌ای از نوبت‌های این بازه">
              <ul className="space-y-2">
                {data.tips.map((tip, i) => {
                  const style = TIP_STYLE[tip.tone];
                  return (
                    <li key={i} className={cx("flex items-start gap-2.5 rounded-2xl p-3 text-sm leading-6", style.className)}>
                      <style.icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>{tip.text}</span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <Kpi label="نوبت‌ها" value={faNum(t.bookings)} hint={`${faNum(t.completed)} انجام‌شده`} tone="accent" />
            <Kpi label="مشتری‌ها" value={faNum(c.total)} hint={`${faNum(c.new)} تازه، ${faNum(c.returning)} قدیمی`} />
            <Kpi label="نرخ لغو" value={faPct(t.cancelRate)} hint={`${faNum(t.cancelled)} نوبت (از هر دو طرف)`} tone={t.cancelRate >= 20 ? "danger" : "ink"} />
            <Kpi label="عدم حضور" value={faPct(t.noShowRate)} hint={`${faNum(t.noShow)} نوبت`} tone={t.noShowRate >= 10 ? "danger" : "ink"} />
          </div>

          <Panel title="شلوغی هفته" hint="نوبت‌های لغونشده به تفکیک روز و ساعت؛ هرچه پررنگ‌تر، شلوغ‌تر.">
            <Heatmap grid={data.grid} days={WEEKDAYS_FA} />
          </Panel>

          <div className="grid gap-3">
            <Panel title="ساعت‌های پرطرفدار">
              <Bars values={hourSpan.map((h) => data.byHour[h])} labels={hourSpan.map((h) => toPersianDigits(h))} labelEvery={hourSpan.length > 12 ? 2 : 1} height={110} />
            </Panel>
            <Panel title="روزهای هفته">
              <Bars values={data.byWeekday} labels={WEEKDAYS_SHORT} height={110} />
            </Panel>
          </div>

          <Panel title="خدمات پرطرفدار" hint={t.revenueToman ? `درآمد نوبت‌های انجام‌شده: ${formatToman(t.revenueToman)}` : undefined}>
            <Meters
              rows={data.services.map((s) => ({
                key: s.serviceId,
                label: s.name,
                value: s.bookings,
                sub: s.revenueToman ? `(${faPct(s.revenueShare)} درآمد)` : undefined,
              }))}
              format={(n) => `${faNum(n)} نوبت`}
            />
          </Panel>

          <div className="grid gap-3">
            <Panel title="مشتری تازه یا قدیمی" hint="تازه: اولین نوبتش پیش شما در همین بازه بوده.">
              <div className="flex h-4 overflow-hidden rounded-full bg-app-card-2" role="img" aria-label={`${faNum(c.returning)} قدیمی، ${faNum(c.new)} تازه`}>
                <div className="h-full bg-app-accent" style={{ width: `${c.total ? (c.returning / c.total) * 100 : 0}%` }} />
                <div className="h-full bg-app-accent/35" style={{ width: `${c.total ? (c.new / c.total) * 100 : 0}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-app-ink"><span className="h-2.5 w-2.5 rounded-full bg-app-accent" />قدیمی {faNum(c.returning)}</span>
                <span className="flex items-center gap-1.5 text-app-ink"><span className="h-2.5 w-2.5 rounded-full bg-app-accent/35" />تازه {faNum(c.new)}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl bg-app-card-2 p-3">
                  <dt className="text-[11px] text-app-muted">بیش از یک بار در این بازه</dt>
                  <dd className="mt-1 text-lg font-black text-app-ink">{faNum(c.repeatInWindow)} نفر</dd>
                </div>
                <div className="rounded-2xl bg-app-card-2 p-3">
                  <dt className="text-[11px] text-app-muted">میانگین نوبت هر مشتری</dt>
                  <dd className="mt-1 text-lg font-black text-app-ink">{toPersianDigits(String(c.avgVisits))}</dd>
                </div>
              </dl>
            </Panel>

            <Panel title="چقدر زودتر نوبت می‌گیرند" hint={`میانه: ${durationLabel(data.leadTime.medianHours)} قبل از نوبت`}>
              <Meters
                rows={[
                  { key: "same", label: "همان روز", value: lead.sameDay },
                  { key: "3", label: "۱ تا ۳ روز قبل", value: lead.upTo3Days },
                  { key: "7", label: "۴ تا ۷ روز قبل", value: lead.upTo7Days },
                  { key: "more", label: "بیش از یک هفته قبل", value: lead.moreThan7Days },
                ]}
                format={(n) => (leadTotal ? faPct(Math.round((n / leadTotal) * 100)) : "—")}
              />
            </Panel>
          </div>

          <Panel title="بازگشت مشتری‌ها" hint="مشتری‌ها به تفکیک ماه اولین نوبت انجام‌شده؛ چند درصد در ۳۰، ۶۰ و ۹۰ روز بعد دوباره آمدند.">
            {hasCohorts ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="text-xs text-app-muted">
                      <th className="pb-2 text-start font-semibold">ماه اولین نوبت</th>
                      <th className="pb-2 font-semibold">مشتری</th>
                      <th className="pb-2 font-semibold">۳۰ روز</th>
                      <th className="pb-2 font-semibold">۶۰ روز</th>
                      <th className="pb-2 font-semibold">۹۰ روز</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cohorts.map((m) => (
                      <tr key={m.month} className="border-t border-app-line">
                        <td className="py-2 font-semibold text-app-ink">{m.month}</td>
                        <td className="py-2 text-center text-app-muted">{faNum(m.customers)}</td>
                        {(["d30", "d60", "d90"] as const).map((k) => {
                          const v = m.customers ? m.returned[k] : null;
                          return (
                            <td key={k} className="py-1.5 text-center">
                              {v === null ? (
                                <span className="text-app-muted" title={m.customers ? "هنوز زود است" : undefined}>—</span>
                              ) : (
                                <span
                                  className="inline-block min-w-12 rounded-lg px-2 py-1 text-xs font-bold text-app-ink"
                                  style={{ background: `color-mix(in srgb, var(--app-accent) ${10 + v * 0.8}%, transparent)` }}
                                >
                                  {faPct(Math.round(v))}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-app-muted">«—» یعنی هنوز آن‌قدر زمان نگذشته که بشود گفت.</p>
              </div>
            ) : (
              <p className="py-3 text-center text-sm text-app-muted">هنوز نوبت انجام‌شده‌ای در ۶ ماه اخیر نیست.</p>
            )}
          </Panel>

          <Panel title="لغو و عدم حضور مکرر" hint="مشتری‌هایی که دست‌کم ۲ بار نیامدند یا ۳ بار لغو یا غیبت داشتند. لغو شامل لغو از طرف شما هم می‌شود.">
            {data.unreliable.length === 0 ? (
              <p className="flex items-center justify-center gap-2 py-3 text-sm text-app-done"><Sparkles className="h-4 w-4" /> مشتری بدقولی در این بازه نیست.</p>
            ) : (
              <ListGroup className="shadow-none">
                {data.unreliable.map((u) => (
                  <div key={u.customerId} className="flex items-center gap-3 px-4 py-3">
                    <Users className="h-5 w-5 shrink-0 text-app-muted" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-app-ink">{u.name}</p>
                      <p className="text-xs text-app-muted">آخرین نوبت {formatSalonDate(u.lastAt)}<Sep />{faNum(u.bookings)} نوبت</p>
                    </div>
                    <div className="text-end text-xs">
                      {u.noShows > 0 && <p className="font-bold text-app-danger">{faNum(u.noShows)} عدم حضور</p>}
                      {u.cancellations > 0 && <p className="text-app-muted">{faNum(u.cancellations)} لغو</p>}
                    </div>
                  </div>
                ))}
              </ListGroup>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
