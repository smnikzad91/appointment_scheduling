"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, SearchX, Wallet } from "lucide-react";
import { Button, Card, ChipTabs, EmptyState, ErrorBanner, ListGroup, ListSkeleton, SectionTitle, cx } from "./ui";
import PickerSelect from "./PickerSelect";
import type { WalletDirection, WalletPeriod, WalletSort } from "@/lib/walletQuery";
import { formatSalonDate, formatSalonDateTime } from "@/lib/salonTime";
import { toPersianDigits } from "@/lib/persian";
import WalletWithdraw from "./WalletWithdraw";

// Wallet balance and its movements (GET /api/user/finance/wallet): top-ups, booking pre-payments
// and refunds for a customer; pre-payments received (and any taken back) for a salon owner.
// The movements are paged (PAGE_SIZE) and can be filtered by direction, type and period and sorted
// by date or amount — all done by the route (lib/walletQuery.ts).

export type WalletTxKind = "top_up" | "prepayment" | "prepayment_refund" | "prepayment_income" | "prepayment_income_reversal" | "withdrawal" | "withdrawal_reversal" | "payout_sent" | "payout_received" | "plan_purchase" | "plan_credit" | "balance_payment" | "balance_income" | "balance_income_reversal" | "balance_refund" | "sms_cost" | "admin_adjustment";

interface WalletTx {
  id: string;
  kind: WalletTxKind;
  amountToman: number;
  balanceAfter: number;
  createdAt: string;
  appointment: { startAt: string; salonName: string; timezone: string } | null;
  /** payouts: the stylist / salon on the other side; plan purchases: plan and months */
  detail: string | null;
  /** SMS_COST: which SMS («یادآوری ۱ ساعته به مشتری»…); ADMIN_ADJUSTMENT: the admin's reason */
  note: string | null;
}

const KIND_LABEL: Record<WalletTxKind, string> = {
  top_up: "شارژ کیف پول",
  prepayment: "پیش‌پرداخت نوبت",
  prepayment_refund: "بازگشت پیش‌پرداخت (لغو نوبت)",
  prepayment_income: "پیش‌پرداخت دریافتی نوبت",
  prepayment_income_reversal: "برگشت پیش‌پرداخت دریافتی",
  withdrawal: "برداشت به حساب بانکی",
  withdrawal_reversal: "بازگشت برداشت (رد یا لغو)",
  payout_sent: "پرداخت به آرایشگر",
  payout_received: "پرداخت سالن",
  plan_purchase: "خرید پلن",
  plan_credit: "اعتبار پلن قبلی (تغییر پلن)",
  balance_payment: "پرداخت باقی‌مانده نوبت",
  balance_income: "باقی‌مانده نوبت (از کیف پول مشتری)",
  balance_income_reversal: "برگشت باقی‌مانده دریافتی",
  balance_refund: "بازگشت باقی‌مانده پرداختی",
  sms_cost: "هزینه پیامک",
  admin_adjustment: "اصلاح موجودی توسط پشتیبانی",
};

interface WalletData {
  balanceToman: number;
  items: WalletTx[];
  total: number;
  page: number;
  pageSize: number;
  /** money in / out over all the rows matching the filters, not just this page */
  inToman: number;
  outToman: number;
  /** the kinds this account has at all, for the type filter */
  kinds: WalletTxKind[];
}

const PAGE_SIZE = 20;

const DIRECTIONS: { value: WalletDirection; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "in", label: "واریز" },
  { value: "out", label: "برداشت" },
];
const PERIODS: { value: WalletPeriod; label: string }[] = [
  { value: "all", label: "همه زمان‌ها" },
  { value: "7", label: "۷ روز اخیر" },
  { value: "30", label: "۳۰ روز اخیر" },
  { value: "90", label: "۳ ماه اخیر" },
  { value: "365", label: "یک سال اخیر" },
];
const SORTS: { value: WalletSort; label: string }[] = [
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "credit", label: "بیشترین واریز" },
  { value: "debit", label: "بیشترین برداشت" },
];

interface Filters { direction: WalletDirection; kind: WalletTxKind | ""; period: WalletPeriod; sort: WalletSort }
const NO_FILTERS: Filters = { direction: "all", kind: "", period: "all", sort: "newest" };

const fa = (n: number) => toPersianDigits(Math.abs(n).toLocaleString("en-US").replace(/,/g, "٬"));

export default function WalletHistory({ reloadKey = 0, title = "کیف پول" }: { reloadKey?: number; title?: string }) {
  const [data, setData] = useState<WalletData | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const listTop = useRef<HTMLDivElement>(null);
  const latest = useRef(0);

  const load = useCallback(() => {
    const request = ++latest.current; // a slower earlier answer must not replace a newer one
    setFailed(false);
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort: filters.sort, direction: filters.direction, period: filters.period });
    if (filters.kind) params.set("kind", filters.kind);
    fetch(`/api/user/finance/wallet?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: WalletData) => {
        if (request !== latest.current) return;
        // The last page emptied (e.g. fewer rows after a refresh): step back to the new last page.
        if (d.items.length === 0 && d.total > 0 && page > 1) setPage(Math.ceil(d.total / PAGE_SIZE));
        setData(d);
      })
      .catch(() => request === latest.current && setFailed(true))
      .finally(() => request === latest.current && setLoading(false));
  }, [page, filters]);
  useEffect(() => { queueMicrotask(load); }, [load, reloadKey]);

  const change = (next: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...next }));
    setPage(1);
  };
  const goTo = (p: number) => {
    setPage(p);
    listTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (failed && !data) return <ErrorBanner onRetry={load}>کیف پول بارگذاری نشد.</ErrorBanner>;
  if (!data) return <ListSkeleton rows={3} />;

  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const filtered = filters.direction !== "all" || filters.kind !== "" || filters.period !== "all";
  const kindOptions = [
    { value: "", label: "همه نوع‌ها" },
    ...data.kinds.map((k) => ({ value: k, label: KIND_LABEL[k] ?? k })).sort((a, b) => a.label.localeCompare(b.label, "fa")),
  ];

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
          {negative && (
            <p className="mt-1 text-xs leading-5 text-app-danger">
              بدهی به کیف پول (برگشت درآمدی که قبلاً دریافت شده بود)؛ از درآمدهای بعدی کم می‌شود یا با شارژ کیف پول صاف می‌شود. تا آن موقع برداشت و پرداخت از کیف پول ممکن نیست.
            </p>
          )}
        </div>
        <Wallet className="h-8 w-8 text-app-accent" />
      </Card>

      <WalletWithdraw balanceToman={data.balanceToman} onChange={load} />

      <div ref={listTop} className="scroll-mt-20" />
      <SectionTitle
        action={filtered || filters.sort !== "newest" ? (
          <button type="button" onClick={() => change(NO_FILTERS)} className="text-xs font-semibold text-app-accent">
            پاک کردن فیلترها
          </button>
        ) : undefined}
      >
        گردش کیف پول
      </SectionTitle>

      <ChipTabs options={DIRECTIONS} value={filters.direction} onChange={(direction) => change({ direction })} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <PickerSelect title="نوع تراکنش" value={filters.kind} onChange={(kind) => change({ kind: kind as WalletTxKind | "" })} options={kindOptions} />
        <PickerSelect title="بازه زمانی" value={filters.period} onChange={(period) => change({ period: period as WalletPeriod })} options={PERIODS} />
        <PickerSelect title="مرتب‌سازی" value={filters.sort} onChange={(sort) => change({ sort: sort as WalletSort })} options={SORTS} />
      </div>

      {data.total > 0 && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-muted">
          <span>{toPersianDigits(data.total)} تراکنش</span>
          {data.inToman > 0 && <span className="text-app-done">واریز {fa(data.inToman)} تومان</span>}
          {data.outToman > 0 && <span className="text-app-danger">برداشت {fa(data.outToman)} تومان</span>}
        </p>
      )}
      {failed && <ErrorBanner onRetry={load}>گردش کیف پول بارگذاری نشد.</ErrorBanner>}

      {data.items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={SearchX}
            title="تراکنشی با این فیلترها نیست"
            action={<Button variant="secondary" onClick={() => change(NO_FILTERS)}>پاک کردن فیلترها</Button>}
          />
        ) : (
          <EmptyState icon={Wallet} title="هنوز گردشی ندارید" />
        )
      ) : (
        <ListGroup className={cx("transition-opacity", loading && "opacity-60")}>
          {data.items.map((t) => {
            const credit = t.amountToman > 0;
            const Icon = credit ? ArrowDownLeft : ArrowUpRight;
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                {/* no +/− sign next to a Persian amount (it drifts in RTL): the arrow and colour say it */}
                <Icon className={`h-5 w-5 shrink-0 ${credit ? "text-app-done" : "text-app-danger"}`} aria-label={credit ? "واریز" : "برداشت"} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-app-ink">
                    {KIND_LABEL[t.kind] ?? t.kind}
                    {t.note && <span className="font-normal text-app-muted">: {t.note}</span>}
                  </p>
                  <p className="text-xs text-app-muted">
                    {t.appointment
                      ? `${t.appointment.salonName}، نوبت ${formatSalonDateTime(t.appointment.startAt, t.appointment.timezone)}`
                      : [t.detail, formatSalonDate(t.createdAt)].filter(Boolean).join("، ")}
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

      {pages > 1 && (
        <nav className="flex items-center justify-between gap-2" aria-label="صفحه‌بندی گردش کیف پول">
          {/* RTL: «قبلی» sits on the right with a right-pointing arrow */}
          <Button variant="secondary" icon={ChevronRight} disabled={page <= 1 || loading} onClick={() => goTo(page - 1)} className="h-10 px-4 text-sm">
            قبلی
          </Button>
          <span className="text-sm text-app-muted">
            صفحه {toPersianDigits(page)} از {toPersianDigits(pages)}
          </span>
          <Button variant="secondary" disabled={page >= pages || loading} onClick={() => goTo(page + 1)} className="h-10 px-4 text-sm">
            بعدی
            <ChevronLeft className="h-[18px] w-[18px]" aria-hidden />
          </Button>
        </nav>
      )}
    </div>
  );
}
