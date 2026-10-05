"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, CalendarCheck2, Download, Paperclip, Plus, Receipt, Scissors, Trash2, Users, Wallet } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import {
  EXPENSE_CATEGORY_LABEL,
  PAYOUT_METHOD_LABEL,
  adjustCharge,
  createExpense,
  createPayout,
  deleteExpense,
  deletePayout,
  getSalonSummary,
  listExpenses,
  listIncome,
  listPayouts,
  updateExpense,
  type Expense,
  type ExpenseCategory,
  type IncomeItem,
  type Payout,
  type PayoutMethod,
  type SalonSummary,
  type StylistAccount,
} from "@/lib/api/accounting";
import { persianApiError } from "@/lib/api/errorMessages";
import { jalaliMonthPeriod, type AccountingPeriod } from "@/lib/accountingPeriod";
import { jalaliDate, jalaliMonthSlug, type Report } from "@/lib/accountingExport";
import ExportSheet from "@/components/app/AccountingReport";
import ZeroCommissionNotice from "@/components/app/ZeroCommissionNotice";
import { getMySalon } from "@/lib/api/ownerSalon";
import { isIndependent } from "@/lib/independent";
import { formatToman, toPersianDigits } from "@/lib/persian";
import { addDaysToDateKey, toSalonWallTime } from "@/lib/salonTime";
import MoneyInput from "@/components/app/MoneyInput";
import { ReceiptField, useReceipt } from "@/components/app/ReceiptField";
import Sheet from "@/components/app/Sheet";
import Sep from "@/components/common/Sep";
import { BalanceChip, DaySelect, HeroAmount, MoneyFigure, PeriodSwitcher, dayKeyToInstant, formatPercent, instantToDayKey, shortDate } from "@/components/app/accounting";
import Link from "next/link";
import WalletHistory from "@/components/app/WalletHistory";
import { Avatar, Button, ChipTabs, EmptyState, ErrorBanner, Field, IconButton, ListSkeleton, PageHeader, TextInput, cx, riseStyle } from "@/components/app/ui";
import { toastError } from "@/lib/toastError";

type Tab = "stylists" | "income" | "expenses" | "services" | "wallet";
const METHODS = Object.keys(PAYOUT_METHOD_LABEL) as PayoutMethod[];
const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[];

export default function SalonAccountingPage() {
  const token = useApiAccessToken();
  const [offset, setOffset] = useState(0);
  const period = useMemo(() => jalaliMonthPeriod(offset), [offset]);
  const [tab, setTab] = useState<Tab>("stylists");
  // An independent stylist is the business: no stylists tab, shares or balances — income, costs, net.
  const [independent, setIndependent] = useState(false);
  useEffect(() => {
    if (!token) return;
    getMySalon(token)
      .then((s) => {
        if (!isIndependent(s)) return;
        setIndependent(true);
        setTab((t) => (t === "stylists" ? "income" : t));
      })
      .catch(() => {});
  }, [token]);

  const [summary, setSummary] = useState<{ key: string; data: SalonSummary } | null>(null);
  const [income, setIncome] = useState<{ key: string; items: IncomeItem[] } | null>(null);
  const [expenses, setExpenses] = useState<{ key: string; items: Expense[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  const [stylistSheet, setStylistSheet] = useState<StylistAccount | null>(null);
  const [chargeSheet, setChargeSheet] = useState<IncomeItem | null>(null);
  const [expenseSheet, setExpenseSheet] = useState<{ expense: Expense | null; n: number } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const key = `${period.from}|${version}`;
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const p = { from: period.from, to: period.to };
    Promise.all([getSalonSummary(token, p), listIncome(token, p), listExpenses(token, p)])
      .then(([s, i, e]) => {
        if (cancelled) return;
        setError(null);
        setSummary({ key, data: s });
        setIncome({ key, items: i });
        setExpenses({ key, items: e });
      })
      .catch(() => !cancelled && setError("دریافت اطلاعات حسابداری انجام نشد"));
    return () => {
      cancelled = true;
    };
  }, [token, period, key]);

  const data = summary?.key === key ? summary.data : summary?.data ?? null; // keep the old numbers visible while reloading
  const loading = summary?.key !== key;
  const report = useMemo(
    () => (exportOpen && data && income && expenses ? buildSalonReport(period, data, income.items, expenses.items) : null),
    [exportOpen, data, income, expenses, period],
  );

  if (!token || (!data && !error)) {
    return (
      <>
        <PageHeader title="حسابداری" />
        <ListSkeleton rows={4} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="حسابداری"
        subtitle={independent ? "درآمد، هزینه‌ها و سود خالص شما" : "درآمد، سهم آرایشگرها، پرداخت‌ها و هزینه‌های سالن"}
        action={data && <IconButton icon={Download} label="خروجی اکسل یا PDF" tone="plain" onClick={() => setExportOpen(true)} />}
      />
      <PeriodSwitcher period={period} onChange={setOffset} />
      {error && <ErrorBanner onRetry={refresh}>{error}</ErrorBanner>}

      {data && (
        <div className={cx("transition-opacity", loading && "opacity-60")}>
          {/* Profit & loss for the month */}
          <section className="rounded-[32px] bg-[#2a1d26] p-5 text-[#f8f1e9] shadow-app dark:bg-[#33232f] dark:ring-1 dark:ring-app-line">
            {/* No minus sign: next to Persian digits in RTL it drifts to the wrong side and is easy to miss. */}
            <p className="text-xs text-white/60">
              {data.totals.netProfitToman < 0 ? "زیان خالص" : "سود خالص"}
              {!independent && " سالن"} در {period.label}
            </p>
            <p className={cx("mt-1 text-[30px] font-black leading-tight", data.totals.netProfitToman < 0 && "text-[#ff9b8a]")}>
              {formatToman(Math.abs(data.totals.netProfitToman))}
            </p>
            {data.totals.netProfitToman < 0 && (
              <p className="mt-1 text-xs text-[#ff9b8a]">
                {independent ? "هزینه‌های این ماه از درآمد بیشتر بوده است." : "هزینه‌های این ماه از سهم سالن بیشتر بوده است."}
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-3xl bg-white/[0.06] p-4">
              <HeroAmount label="درآمد کل" amount={data.totals.incomeToman} />
              {!independent && (
                <>
                  <HeroAmount label="سهم آرایشگرها" amount={data.totals.stylistShareToman} />
                  <HeroAmount label="سهم سالن" amount={data.totals.salonShareToman} />
                </>
              )}
              <HeroAmount label="هزینه‌ها" amount={data.totals.expensesToman} />
            </div>
            <p className="mt-3 flex flex-wrap items-center text-xs text-white/65">
              <CalendarCheck2 className="me-1.5 h-4 w-4" aria-hidden />
              {toPersianDigits(data.totals.appointmentCount)} نوبت انجام‌شده
              {data.totals.tipsToman > 0 && (
                <>
                  <Sep />
                  انعام‌ها: {formatToman(data.totals.tipsToman)}
                </>
              )}
              {!independent && (
                <>
                  <Sep />
                  طلب آرایشگرها: {formatToman(data.totals.owedToStylistsToman)}
                </>
              )}
            </p>
          </section>

          <div className="mt-4">
            <ChipTabs<Tab>
              value={tab}
              onChange={setTab}
              options={[
                ...(independent ? [] : [{ value: "stylists" as const, label: "آرایشگرها" }]),
                { value: "income", label: "درآمدها", count: income?.items.length },
                { value: "expenses", label: "هزینه‌ها", count: expenses?.items.length },
                // pre-payments of completed / no-show online bookings land in the owner's wallet
                { value: "wallet" as const, label: "کیف پول" },
                { value: "services", label: "خدمات" },
              ]}
            />
          </div>

          {tab === "stylists" && !independent &&
            (data.stylists.length === 0 ? (
              <EmptyState icon={Users} title="هنوز آرایشگری ندارید" hint="از تب آرایشگرها، آرایشگر اضافه کنید و سهم او را تعیین کنید." />
            ) : (
              <div className="flex flex-col gap-2.5">
                <ZeroCommissionNotice stylists={data.stylists} />
                {data.stylists.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    style={riseStyle(i)}
                    onClick={() => setStylistSheet(s)}
                    className="app-rise rounded-3xl border border-app-line bg-app-card p-4 text-start shadow-app active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={s.displayName} src={s.avatarUrl} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-black text-app-ink">
                          {s.displayName}
                          {!s.active && <span className="ms-2 text-xs font-medium text-app-muted">(غیرفعال)</span>}
                        </p>
                        <p className="text-xs text-app-muted">
                          سهم {formatPercent(s.commissionPercent)}<Sep />
                          {toPersianDigits(s.appointmentCount)} نوبت
                        </p>
                      </div>
                      <BalanceChip balanceToman={s.balanceToman} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-app-card-2 px-3 py-2.5">
                      <MoneyFigure label="درآمد" amount={s.incomeToman} />
                      <MoneyFigure label="سهم آرایشگر" amount={s.shareToman} tone="accent" />
                      <MoneyFigure label="پرداخت‌شده" amount={s.paidInPeriodToman} tone="muted" />
                    </div>
                  </button>
                ))}
                <p className="px-1 text-xs leading-6 text-app-muted">
                  «طلب» یعنی سالن هنوز این مبلغ را از سهم آرایشگر پرداخت نکرده (از همه ماه‌ها). برای ثبت پرداخت، روی آرایشگر بزنید.
                </p>
              </div>
            ))}

          {tab === "income" &&
            (!income || income.items.length === 0 ? (
              <EmptyState icon={Wallet} title="درآمدی در این ماه ثبت نشده" hint="وقتی نوبتی «انجام‌شده» شود، مبلغ آن و سهم آرایشگر اینجا ثبت می‌شود." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {income.items.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    style={riseStyle(i)}
                    onClick={() => setChargeSheet(item)}
                    className="app-rise rounded-3xl border border-app-line bg-app-card p-4 text-start shadow-app active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-app-ink">{item.customerName}</p>
                        <p className="mt-0.5 truncate text-xs text-app-muted">
                          {shortDate(item.startAt)}
                          {!independent && (
                            <>
                              <Sep />
                              {item.stylist.displayName}
                            </>
                          )}
                          <Sep />
                          {item.services.join("، ")}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="font-black text-app-ink">{formatToman(item.chargedToman + item.tipToman)}</p>
                        {item.tipToman > 0 && <p className="text-[11px] font-bold text-app-done">با {formatToman(item.tipToman)} انعام</p>}
                      </div>
                    </div>
                    {/* An independent stylist has no split: the whole amount is theirs. */}
                    {independent ? (
                      item.chargedToman !== item.priceToman && <p className="mt-2 text-xs text-app-pending">مبلغ اصلاح‌شده</p>
                    ) : (
                      <p className="mt-2 text-xs text-app-muted">
                        سهم آرایشگر ({formatPercent(item.commissionPercent)}{item.tipToman > 0 && " + انعام"}):{" "}
                        <span className="font-bold text-app-accent">{formatToman(item.stylistShareToman)}</span>
                        <Sep />
                        سهم سالن: <span className="font-bold text-app-ink">{formatToman(item.salonShareToman)}</span>
                        {item.chargedToman !== item.priceToman && (
                          <>
                            <Sep />
                            <span className="text-app-pending">اصلاح‌شده</span>
                          </>
                        )}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ))}

          {tab === "wallet" && (
            <div className="mt-4">
              <WalletHistory title="موجودی کیف پول" />
              <Link href="/salon/wallet" className="mt-3 block text-center text-sm font-bold text-app-accent">شارژ کیف پول ←</Link>
            </div>
          )}
          {tab === "expenses" && (
            <>
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-sm text-app-muted">
                  جمع هزینه‌ها: <span className="font-black text-app-ink">{formatToman(data.totals.expensesToman)}</span>
                </p>
                <IconButton icon={Plus} label="افزودن هزینه" onClick={() => setExpenseSheet({ expense: null, n: Date.now() })} />
              </div>
              {data.expensesByCategory.length > 0 && (
                <div className="mb-3 rounded-3xl border border-app-line bg-app-card p-4 shadow-app">
                  {data.expensesByCategory.map((c) => (
                    <div key={c.category} className="mb-2.5 last:mb-0">
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold text-app-ink">{EXPENSE_CATEGORY_LABEL[c.category]}</span>
                        <span className="text-app-muted">{formatToman(c.amountToman)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-app-card-2">
                        <div className="h-full rounded-full bg-app-accent" style={{ width: `${(c.amountToman / data.totals.expensesToman) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!expenses || expenses.items.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="هزینه‌ای در این ماه ثبت نشده"
                  hint="اجاره، مواد مصرفی، قبوض و… را ثبت کنید تا سود خالص سالن درست محاسبه شود."
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {expenses.items.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setExpenseSheet({ expense: e, n: Date.now() })}
                      className="flex items-center gap-3 rounded-3xl border border-app-line bg-app-card px-4 py-3 text-start shadow-app active:scale-[0.99]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-app-card-2 text-app-muted">
                        <Receipt className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-bold text-app-ink">{EXPENSE_CATEGORY_LABEL[e.category]}</span>
                          {e.receiptUrl && <Paperclip className="h-3.5 w-3.5 shrink-0 text-app-muted" aria-label="رسید دارد" />}
                        </span>
                        <span className="block truncate text-xs text-app-muted">
                          {shortDate(e.spentAt)}
                          {e.note && (
                            <>
                              <Sep />
                              {e.note}
                            </>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 font-black text-app-ink">{formatToman(e.amountToman)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "services" &&
            (data.services.length === 0 ? (
              <EmptyState icon={Scissors} title="در این ماه خدمتی انجام نشده" />
            ) : (
              <div className="flex flex-col gap-2">
                {data.services.map((s, i) => (
                  <div key={s.serviceId} className="flex items-center gap-3 rounded-3xl border border-app-line bg-app-card px-4 py-3 shadow-app">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-sm font-black text-app-accent">
                      {toPersianDigits(i + 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-app-ink">{s.name}</span>
                      <span className="block text-xs text-app-muted">{toPersianDigits(s.count)} بار</span>
                    </span>
                    <span className="shrink-0 font-black text-app-ink">{formatToman(s.bookedToman)}</span>
                  </div>
                ))}
                <p className="px-1 text-xs leading-6 text-app-muted">بر اساس قیمت هر خدمت در زمان رزرو (پیش از اصلاح مبلغ).</p>
              </div>
            ))}
        </div>
      )}

      {stylistSheet && (
        <StylistAccountSheet
          key={stylistSheet.id}
          token={token}
          stylist={data?.stylists.find((s) => s.id === stylistSheet.id) ?? stylistSheet}
          onClose={() => setStylistSheet(null)}
          onChanged={refresh}
        />
      )}
      <ExportSheet report={report} onClose={() => setExportOpen(false)} />
      {chargeSheet && <ChargeSheet key={chargeSheet.id} token={token} item={chargeSheet} independent={independent} onClose={() => setChargeSheet(null)} onSaved={refresh} />}
      {expenseSheet && (
        <ExpenseSheet
          key={expenseSheet.n}
          token={token}
          expense={expenseSheet.expense}
          periodFrom={period.from}
          periodTo={period.to}
          onClose={() => setExpenseSheet(null)}
          onSaved={refresh}
        />
      )}
    </>
  );
}

/** A stylist's account: balance, record a payout, recent payouts. */
function StylistAccountSheet({ token, stylist, onClose, onChanged }: { token: string; stylist: StylistAccount; onClose: () => void; onChanged: () => void }) {
  const todayKey = toSalonWallTime(new Date()).dateKey;
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [amount, setAmount] = useState<number | null>(stylist.balanceToman > 0 ? stylist.balanceToman : null);
  const [method, setMethod] = useState<PayoutMethod>("CARD_TO_CARD");
  const [dayKey, setDayKey] = useState(todayKey);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadPayouts = useCallback(() => {
    listPayouts(token, { stylistId: stylist.id })
      .then(setPayouts)
      .catch(() => setPayouts([]));
  }, [token, stylist.id]);
  useEffect(loadPayouts, [loadPayouts]);

  async function save() {
    if (!amount) return toastError("مبلغ پرداخت را وارد کنید");
    setBusy(true);
    try {
      await createPayout(token, { stylistId: stylist.id, amountToman: amount, method, paidAt: dayKeyToInstant(dayKey), note: note.trim() || undefined });
      setAmount(null);
      setNote("");
      loadPayouts();
      onChanged();
    } catch (err) {
      toastError(persianApiError(err, "ثبت پرداخت انجام نشد"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Payout) {
    if (confirmDelete !== p.id) return setConfirmDelete(p.id);
    try {
      await deletePayout(token, p.id);
      setConfirmDelete(null);
      loadPayouts();
      onChanged();
    } catch (err) {
      toastError(persianApiError(err, "حذف پرداخت انجام نشد"));
    }
  }

  return (
    <Sheet open onClose={() => !busy && onClose()} title={`حساب ${stylist.displayName}`}>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={stylist.displayName} src={stylist.avatarUrl} size={52} />
        <div className="min-w-0 flex-1">
          <p className="font-black text-app-ink">{stylist.displayName}</p>
          <p className="text-xs text-app-muted">سهم پیش‌فرض از درآمد: {formatPercent(stylist.commissionPercent)}</p>
        </div>
        <BalanceChip balanceToman={stylist.balanceToman} size="lg" />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2 rounded-3xl bg-app-card-2 p-3.5">
        <MoneyFigure label="درآمد این ماه" amount={stylist.incomeToman} />
        <MoneyFigure label="سهم این ماه" amount={stylist.shareToman} tone="accent" />
        <MoneyFigure label="پرداختی این ماه" amount={stylist.paidInPeriodToman} tone="muted" />
      </div>

      <section className="rounded-3xl border border-app-line bg-app-card p-4">
        <h3 className="mb-3 flex items-center gap-2 font-black text-app-ink">
          <Banknote className="h-5 w-5 text-app-accent" aria-hidden />
          ثبت پرداخت به آرایشگر
        </h3>
        <div className="flex flex-col gap-3">
          <Field label="مبلغ" hint={stylist.balanceToman > 0 ? `مانده طلب: ${formatToman(stylist.balanceToman)}` : "پرداخت بیشتر از طلب، پیش‌پرداخت ثبت می‌شود."}>
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                aria-pressed={method === m}
                className={cx(
                  "h-11 rounded-2xl text-sm font-bold transition active:scale-95",
                  method === m ? "bg-app-ink text-app-bg" : "border border-app-line bg-app-card text-app-muted",
                )}
              >
                {PAYOUT_METHOD_LABEL[m]}
              </button>
            ))}
          </div>
          {method === "WALLET" ? (
            <p className="rounded-2xl bg-app-card-2 p-3 text-xs leading-6 text-app-muted">
              مبلغ همین حالا از کیف پول شما به کیف پول {stylist.displayName} منتقل می‌شود و قابل حذف نیست.{" "}
              <Link href="/salon/wallet" className="font-bold text-app-accent">موجودی و شارژ کیف پول</Link>
            </p>
          ) : (
            <Field label="تاریخ">
              <DaySelect label="تاریخ پرداخت" value={dayKey} onChange={setDayKey} fromKey={addDaysToDateKey(todayKey, -90)} toKey={todayKey} />
            </Field>
          )}
          <TextInput value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="توضیح (اختیاری)، مثلاً تسویه شهریور" />
          <Button block busy={busy} onClick={save}>
            ثبت پرداخت{amount ? ` ${formatToman(amount)}` : ""}
          </Button>
        </div>
      </section>

      <h3 className="mb-2 mt-5 px-1 text-[13px] font-bold text-app-muted">پرداخت‌های اخیر</h3>
      {!payouts ? (
        <ListSkeleton rows={2} />
      ) : payouts.length === 0 ? (
        <p className="rounded-2xl bg-app-card-2 p-4 text-sm text-app-muted">هنوز پرداختی ثبت نشده است.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {payouts.slice(0, 20).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-app-line px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
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
              {/* wallet payouts moved real money (or are a booking's pre-payment share): not deletable */}
              {p.method !== "WALLET" && <button
                type="button"
                onClick={() => remove(p)}
                aria-label="حذف پرداخت"
                className={cx(
                  "flex h-9 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs font-bold active:scale-95",
                  confirmDelete === p.id ? "bg-app-danger text-white" : "bg-app-danger/10 text-app-danger",
                )}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {confirmDelete === p.id && "حذف شود؟"}
              </button>}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/** Correct what a completed appointment actually brought in; the split follows. */
function ChargeSheet({
  token,
  item,
  independent,
  onClose,
  onSaved,
}: {
  token: string;
  item: IncomeItem;
  /** An independent stylist: no split — amount and tip are all theirs. */
  independent: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState<number | null>(item.chargedToman);
  const [tipAmount, setTipAmount] = useState<number | null>(item.tipToman || null);
  const [busy, setBusy] = useState(false);
  const value = amount ?? 0;
  const tip = tipAmount ?? 0;
  const commission = Math.round((value * item.commissionPercent) / 100);
  const changed = value !== item.chargedToman || tip !== item.tipToman;

  async function save() {
    setBusy(true);
    try {
      await adjustCharge(token, item.id, value, tip);
      onSaved();
      onClose();
    } catch (err) {
      toastError(persianApiError(err, "ذخیره مبلغ انجام نشد"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={() => !busy && onClose()}
      title="مبلغ دریافتی"
      footer={
        changed ? (
          <Button block busy={busy} onClick={save}>
            ذخیره {formatToman(value + tip)}
          </Button>
        ) : undefined
      }
    >
      <p className="font-bold text-app-ink">{item.customerName}</p>
      <p className="mb-4 text-sm text-app-muted">
        {shortDate(item.startAt)}
        <Sep />
        {item.stylist.displayName}
        <Sep />
        {item.services.join("، ")}
      </p>
      <Field label="مبلغی که مشتری پرداخت کرد" hint={`قیمت زمان رزرو: ${formatToman(item.priceToman)} — برای تخفیف یا خدمت اضافه، مبلغ واقعی را وارد کنید.`}>
        <MoneyInput value={amount} onChange={setAmount} />
      </Field>
      <div className="mt-3">
        <Field
          label={independent ? "انعام (اختیاری)" : "انعام برای آرایشگر (اختیاری)"}
          hint={independent ? "اگر مشتری انعام داد؛ جزو درآمد شما حساب می‌شود." : "اگر مشتری انعام را به سالن داد (مثلاً روی کارت‌خوان)؛ تمامش سهم آرایشگر است."}
        >
          <MoneyInput value={tipAmount} onChange={setTipAmount} />
        </Field>
      </div>
      {!independent && (
        <>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-3xl bg-app-card-2 p-4">
        <MoneyFigure label={`سهم آرایشگر (${formatPercent(item.commissionPercent)}${tip ? " + انعام" : ""})`} amount={commission + tip} tone="accent" />
        <MoneyFigure label="سهم سالن" amount={value - commission} />
      </div>
      <p className="mt-2 px-1 text-xs leading-6 text-app-muted">
        درصد سهم همانی است که هنگام انجام این نوبت برای آرایشگر ثبت بود (اگر خدمتی درصد جداگانه داشته باشد، میانگین وزنی بر اساس قیمت).
      </p>
        </>
      )}
    </Sheet>
  );
}

/** Add or edit one expense. */
function ExpenseSheet({
  token,
  expense,
  periodFrom,
  periodTo,
  onClose,
  onSaved,
}: {
  token: string;
  expense: Expense | null;
  periodFrom: string;
  periodTo: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const todayKey = toSalonWallTime(new Date()).dateKey;
  const fromKey = instantToDayKey(periodFrom);
  const lastKey = addDaysToDateKey(instantToDayKey(periodTo), -1);
  const toKey = lastKey < todayKey ? lastKey : todayKey;
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? "SUPPLIES");
  const [amount, setAmount] = useState<number | null>(expense?.amountToman ?? null);
  const [dayKey, setDayKey] = useState(expense ? instantToDayKey(expense.spentAt) : toKey);
  const [note, setNote] = useState(expense?.note ?? "");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const receipt = useReceipt(expense?.receiptUrl ?? null, "salon-expenses", (message) => message && toastError(message));

  function close() {
    receipt.discard();
    onClose();
  }

  async function save() {
    if (!amount) return toastError("مبلغ هزینه را وارد کنید");
    setBusy("save");
    try {
      const data = { category, amountToman: amount, spentAt: dayKeyToInstant(dayKey), note: note.trim() || undefined, receiptUrl: receipt.url };
      if (expense) await updateExpense(token, expense.id, { ...data, note: note.trim() || null });
      else await createExpense(token, data);
      receipt.saved();
      onSaved();
      close();
    } catch (err) {
      toastError(persianApiError(err, "ذخیره هزینه انجام نشد"));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!expense) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy("delete");
    try {
      await deleteExpense(token, expense.id);
      receipt.deleted();
      onSaved();
      close();
    } catch (err) {
      toastError(persianApiError(err, "حذف هزینه انجام نشد"));
      setBusy(null);
    }
  }

  return (
    <Sheet
      open
      onClose={() => !busy && !receipt.uploading && close()}
      title={expense ? "ویرایش هزینه" : "هزینه جدید"}
      footer={
        <Button block busy={busy === "save"} disabled={busy !== null || receipt.uploading} onClick={save}>
          {expense ? "ذخیره تغییرات" : "ثبت هزینه"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 px-1 text-[13px] font-bold text-app-muted">دسته</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={cx(
                  "h-10 rounded-full px-4 text-sm font-bold transition active:scale-95",
                  category === c ? "bg-app-ink text-app-bg" : "border border-app-line bg-app-card text-app-muted",
                )}
              >
                {EXPENSE_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
        <Field label="مبلغ">
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="تاریخ">
          <DaySelect label="تاریخ هزینه" value={dayKey} onChange={setDayKey} fromKey={fromKey} toKey={toKey} />
        </Field>
        <Field label="توضیح (اختیاری)">
          <TextInput value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً رنگ مو و اکسیدان" />
        </Field>
        <ReceiptField receipt={receipt} />
        {expense && (
          <Button variant="danger" block icon={Trash2} busy={busy === "delete"} disabled={busy !== null} onClick={remove}>
            {confirmDelete ? "بله، این هزینه حذف شود" : "حذف هزینه"}
          </Button>
        )}
      </div>
    </Sheet>
  );
}

/** The month's books as one report — the same data the page shows — for the Excel/PDF export. */
function buildSalonReport(period: AccountingPeriod, data: SalonSummary, income: IncomeItem[], expenses: Expense[]): Report {
  const t = data.totals;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    title: `گزارش حسابداری سالن — ${period.label}`,
    subtitle: `${toPersianDigits(t.appointmentCount)} نوبت انجام‌شده، ${toPersianDigits(income.length)} ردیف درآمد و ${toPersianDigits(expenses.length)} هزینه`,
    fileSlug: `hesabdari-${jalaliMonthSlug(period.from)}`,
    sections: [
      {
        title: "خلاصه",
        columns: ["شرح", "مبلغ (تومان)"],
        rows: [
          ["درآمد کل (با انعام)", t.incomeToman],
          ["انعام‌ها", t.tipsToman],
          ["سهم آرایشگرها (با انعام)", t.stylistShareToman],
          ["سهم سالن", t.salonShareToman],
          ["هزینه‌ها", t.expensesToman],
          [t.netProfitToman < 0 ? "زیان خالص" : "سود خالص", Math.abs(t.netProfitToman)],
          ["پرداختی به آرایشگرها در این ماه", t.payoutsToman],
          ["طلب آرایشگرها (کل)", t.owedToStylistsToman],
        ],
      },
      {
        title: "آرایشگرها",
        columns: ["آرایشگر", "درصد پیش‌فرض", "نوبت", "درآمد", "انعام", "سهم آرایشگر", "پرداختی این ماه", "مانده طلب", "پیش‌پرداخت"],
        rows: data.stylists.map((s) => [
          s.displayName,
          s.commissionPercent,
          s.appointmentCount,
          s.incomeToman,
          s.tipsToman,
          s.shareToman,
          s.paidInPeriodToman,
          Math.max(0, s.balanceToman),
          Math.max(0, -s.balanceToman),
        ]),
      },
      {
        title: "درآمدها",
        columns: ["تاریخ", "مشتری", "آرایشگر", "خدمات", "قیمت رزرو", "مبلغ دریافتی", "انعام", "درصد سهم", "سهم آرایشگر", "سهم سالن"],
        rows: income.map((i) => [
          jalaliDate(i.startAt),
          i.customerName,
          i.stylist.displayName,
          i.services.join("، "),
          i.priceToman,
          i.chargedToman,
          i.tipToman,
          round1(i.commissionPercent),
          i.stylistShareToman,
          i.salonShareToman,
        ]),
        totals: [
          "جمع",
          "",
          "",
          "",
          income.reduce((a, i) => a + i.priceToman, 0),
          income.reduce((a, i) => a + i.chargedToman, 0),
          income.reduce((a, i) => a + i.tipToman, 0),
          "",
          income.reduce((a, i) => a + i.stylistShareToman, 0),
          income.reduce((a, i) => a + i.salonShareToman, 0),
        ],
      },
      {
        title: "هزینه‌ها",
        columns: ["تاریخ", "دسته", "مبلغ", "توضیح", "رسید"],
        rows: expenses.map((e) => [jalaliDate(e.spentAt), EXPENSE_CATEGORY_LABEL[e.category], e.amountToman, e.note ?? "", e.receiptUrl ? "دارد" : ""]),
        totals: ["جمع", "", t.expensesToman, "", ""],
      },
    ],
  };
}
