"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, Radio, Share2 } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getVisitInsights, VISIT_RANGES, type VisitInsights, type VisitRange } from "@/lib/api/insights";
import { Bars, Kpi, Meters, Panel, RangeTabs, change, faNum, faPct } from "@/components/app/insights/charts";
import { DEVICE_LABEL, jalaliDay, jalaliDayMonth, referrerLabel } from "@/components/app/insights/labels";
import { EmptyState, ErrorBanner, ListSkeleton, PageHeader } from "@/components/app/ui";
import Sep from "@/components/common/Sep";

// «آمار بازدید»: the owner's public booking page (/s/<slug>) — views, unique visitors, the daily
// (or, over 3 months, weekly) trend, where visitors came from, devices, the booking funnel and the
// visits → booking conversion, each against the window just before. Visitors are counted by a
// salted hash; no IP is stored (apps/web lib/analytics).

export default function SalonVisitsPage() {
  const token = useApiAccessToken();
  const [days, setDays] = useState<VisitRange>(30);
  const [data, setData] = useState<VisitInsights | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getVisitInsights(token, days)
      .then((d) => !cancelled && (setData(d), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [token, days, retry]);

  // 3 months: weekly bars (last bar = the latest 7 days), otherwise one bar a day
  const trend = useMemo(() => {
    if (!data) return null;
    if (data.days < 90) {
      return {
        values: data.perDay.map((d) => d.visitors),
        labels: data.perDay.map((d) => jalaliDay(d.day)),
        labelEvery: data.days > 7 ? 5 : 1,
        unit: "روزانه",
      };
    }
    const weeks: { start: string; visitors: number }[] = [];
    for (let end = data.perDay.length; end > 0; end -= 7) {
      const chunk = data.perDay.slice(Math.max(0, end - 7), end);
      weeks.unshift({ start: chunk[0].day, visitors: chunk.reduce((s, d) => s + d.visitors, 0) });
    }
    return { values: weeks.map((w) => w.visitors), labels: weeks.map((w) => jalaliDayMonth(w.start)), labelEvery: 2, unit: "هفتگی" };
  }, [data]);

  // Several hosts can be one source (instagram.com, l.instagram.com): merge by label.
  const referrers = useMemo(() => {
    const merged = new Map<string, number>();
    for (const r of data?.referrers ?? []) merged.set(referrerLabel(r.key), (merged.get(referrerLabel(r.key)) ?? 0) + r.visitors);
    return [...merged].map(([label, value]) => ({ key: label, label, value })).sort((a, b) => b.value - a.value);
  }, [data]);

  const header = (
    <PageHeader
      title="آمار بازدید"
      subtitle="بازدید صفحه رزرو شما و تبدیل بازدید به نوبت"
      action={
        <Link href="/salon" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-app-line bg-app-card text-app-ink" aria-label="بازگشت به خانه">
          <ArrowRight className="h-5 w-5" />
        </Link>
      }
    />
  );

  if (failed && !data) return <>{header}<ErrorBanner onRetry={() => setRetry((n) => n + 1)}>آمار بازدید دریافت نشد.</ErrorBanner></>;
  if (!data || !trend) return <>{header}<ListSkeleton rows={4} /></>;

  const visitorsDelta = change(data.totals.visitors, data.previous.visitors);
  const viewsDelta = change(data.totals.views, data.previous.views);
  const funnelTop = Math.max(1, data.totals.visitors);
  const funnel = [
    { key: "visit", label: "بازدید صفحه", value: data.totals.visitors },
    { key: "open", label: "شروع رزرو", value: data.funnel.openedVisitors },
    { key: "done", label: "ثبت نوبت", value: data.funnel.doneVisitors },
  ];

  return (
    <div className="space-y-3">
      {header}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangeTabs options={VISIT_RANGES} value={days} onChange={setDays} />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-app-done/12 px-3 py-1.5 text-xs font-bold text-app-done" title={`بازدیدکننده‌های ${faNum(data.liveMinutes)} دقیقه اخیر`}>
          <Radio className="h-3.5 w-3.5 motion-safe:animate-pulse" aria-hidden />
          {data.liveVisitors ? `${faNum(data.liveVisitors)} نفر همین الان` : "الان کسی در صفحه نیست"}
          <Sep /><span className="font-normal opacity-80">امروز {faNum(data.today.visitors)} نفر</span>
        </span>
      </div>

      {data.totals.views === 0 ? (
        <EmptyState
          icon={Eye}
          title="هنوز بازدیدی در این بازه ثبت نشده"
          hint="لینک رزرو را در بیو اینستاگرام، استوری و پیام‌ها بگذارید تا مشتری‌ها صفحه شما را ببینند."
          action={<Link href="/salon/share" className="inline-flex items-center gap-2 text-sm font-bold text-app-accent"><Share2 className="h-4 w-4" /> کیت معرفی</Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <Kpi label="بازدیدکننده یکتا" value={faNum(data.totals.visitors)} delta={visitorsDelta} tone="accent" />
            <Kpi label="بازدید صفحه" value={faNum(data.totals.views)} delta={viewsDelta} />
            <Kpi label="نوبت ثبت‌شده از صفحه" value={faNum(data.funnel.done)} hint={`${faNum(data.funnel.doneVisitors)} نفر`} />
            <Kpi
              label="نرخ تبدیل بازدید به نوبت"
              value={faPct(data.conversion)}
              hint={data.previous.visitors ? `دوره قبل: ${faPct(data.previous.conversion)}` : "بازدیدکننده‌هایی که نوبت گرفتند"}
            />
          </div>

          <Panel title={`روند بازدیدکننده‌ها (${trend.unit})`} hint="بازدیدکننده یکتا: هر نفر در هر روز یک بار شمرده می‌شود.">
            <Bars values={trend.values} labels={trend.labels} highlight={trend.values.length - 1} labelEvery={trend.labelEvery} />
          </Panel>

          <div className="grid gap-3">
            <Panel title="مسیر رزرو" hint="چند نفر از بازدیدکننده‌ها رزرو را شروع و تمام کردند.">
              <ol className="space-y-3">
                {funnel.map((f, i) => (
                  <li key={f.key}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-app-ink">{f.label}</span>
                      <span className="text-app-muted">
                        {faNum(f.value)} نفر{i > 0 && <span className="ms-1.5 text-[11px]">({faPct(Math.round((f.value / funnelTop) * 1000) / 10)})</span>}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-app-card-2">
                      <div className="h-full rounded-full bg-gradient-to-l from-app-accent to-app-accent-strong" style={{ width: `${(f.value / funnelTop) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
              {data.funnel.openedVisitors > 0 && data.funnel.doneVisitors / data.funnel.openedVisitors < 0.3 && (
                <p className="mt-4 rounded-2xl bg-app-pending/12 p-3 text-xs leading-6 text-app-pending">
                  بیشتر کسانی که رزرو را شروع می‌کنند آن را تمام نمی‌کنند. ساعات کاری بیشتر، قیمت شفاف خدمات و عکس نمونه‌کار در گالری کمک می‌کند.
                </p>
              )}
            </Panel>

            <Panel title="از کجا آمدند" hint="بازدیدکننده یکتا به تفکیک منبع">
              <Meters rows={referrers} format={(n) => `${faNum(n)} نفر`} />
            </Panel>
          </div>

          <Panel title="دستگاه بازدیدکننده‌ها">
            <Meters rows={data.devices.map((d) => ({ key: d.key, label: DEVICE_LABEL[d.key] ?? d.key, value: d.visitors }))} format={(n) => `${faNum(n)} نفر`} />
          </Panel>

          <p className="px-1 text-[11px] leading-5 text-app-muted">
            آمار بدون ذخیره IP و بدون کوکی جمع می‌شود؛ ربات‌ها و پیش‌نمایش لینک‌ها شمرده نمی‌شوند. بازدیدهای بیش از ۱۲۰ روز پیش پاک می‌شوند.
          </p>
        </>
      )}
    </div>
  );
}
