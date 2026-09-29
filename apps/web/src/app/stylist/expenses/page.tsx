"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Paperclip, Plus, Receipt, Trash2, X } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import {
  STYLIST_EXPENSE_CATEGORY_LABEL,
  createMyExpense,
  deleteMyExpense,
  listMyExpenses,
  updateMyExpense,
  type StylistExpense,
  type StylistExpenseCategory,
  type StylistExpensePage,
} from "@/lib/api/accounting";
import { persianApiError } from "@/lib/api/errorMessages";
import { jalaliMonthPeriod } from "@/lib/accountingPeriod";
import { formatToman, toPersianDigits } from "@/lib/persian";
import { addDaysToDateKey, toSalonWallTime } from "@/lib/salonTime";
import { releaseUploads, uploadImage } from "@/lib/uploadImage";
import MoneyInput from "@/components/app/MoneyInput";
import Sheet from "@/components/app/Sheet";
import Sep from "@/components/common/Sep";
import { DaySelect, PeriodSwitcher, dayKeyToInstant, instantToDayKey, shortDate } from "@/components/app/accounting";
import { Button, ChipTabs, EmptyState, ErrorBanner, Field, IconButton, ListSkeleton, PageHeader, TextArea, cx, riseStyle } from "@/components/app/ui";

const PAGE_SIZE = 20;
const CATEGORIES = Object.keys(STYLIST_EXPENSE_CATEGORY_LABEL) as StylistExpenseCategory[];
type Filter = StylistExpenseCategory | "ALL";

/** The stylist's own work costs (materials, tools, products…); they lower the net income on /stylist/earnings. */
export default function StylistExpensesPage() {
  const token = useApiAccessToken();
  const [offset, setOffset] = useState(0);
  const period = useMemo(() => jalaliMonthPeriod(offset), [offset]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<{ key: string; data: StylistExpensePage } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [sheet, setSheet] = useState<{ expense: StylistExpense | null; n: number } | null>(null);

  const key = `${period.from}|${filter}|${page}`;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listMyExpenses(token, { from: period.from, to: period.to }, { category: filter === "ALL" ? undefined : filter, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        // The page ran past the end (its last item deleted here or on another device): show the
        // last page that exists instead of an empty list.
        const lastPage = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
        if (page > lastPage) return setPage(lastPage);
        setError(null);
        setState({ key, data });
      })
      .catch(() => !cancelled && setError("دریافت هزینه‌ها انجام نشد"));
    return () => {
      cancelled = true;
    };
  }, [token, period, filter, page, key, retry]);

  const data = state?.data ?? null;
  const loading = state?.key !== key;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        title="هزینه‌های من"
        subtitle="مواد مصرفی، ابزار و خریدهای کاری؛ از درآمد ماه کم می‌شود"
        action={<IconButton icon={Plus} label="افزودن هزینه" onClick={() => setSheet({ expense: null, n: Date.now() })} />}
      />
      <PeriodSwitcher
        period={period}
        onChange={(o) => {
          setOffset(o);
          setPage(1);
        }}
      />
      <ChipTabs<Filter>
        options={[{ value: "ALL", label: "همه" }, ...CATEGORIES.map((c) => ({ value: c, label: STYLIST_EXPENSE_CATEGORY_LABEL[c] }))]}
        value={filter}
        onChange={(f) => {
          setFilter(f);
          setPage(1);
        }}
      />
      {error && <ErrorBanner onRetry={() => setRetry((r) => r + 1)}>{error}</ErrorBanner>}

      {!data ? (
        !error && <ListSkeleton rows={4} />
      ) : (
        <div className={cx("transition-opacity", loading && "opacity-60")}>
          <p className="mb-3 px-1 text-sm text-app-muted">
            جمع {filter === "ALL" ? "هزینه‌ها" : STYLIST_EXPENSE_CATEGORY_LABEL[filter]} در {period.label}:{" "}
            <span className="font-black text-app-ink">{formatToman(data.totalToman)}</span>
            <Sep />
            {toPersianDigits(data.total)} مورد
          </p>
          {data.items.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="هزینه‌ای در این ماه ثبت نشده"
              hint="خرید مواد، تعمیر ابزار و… را ثبت کنید تا درآمد خالص شما درست محاسبه شود."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {data.items.map((e, i) => (
                <button
                  key={e.id}
                  type="button"
                  style={riseStyle(i)}
                  onClick={() => setSheet({ expense: e, n: Date.now() })}
                  className="app-rise flex items-center gap-3 rounded-3xl border border-app-line bg-app-card px-4 py-3 text-start shadow-app active:scale-[0.99]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-app-card-2 text-app-muted">
                    <Receipt className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-bold text-app-ink">{STYLIST_EXPENSE_CATEGORY_LABEL[e.category]}</span>
                      {e.receiptUrl && <Paperclip className="h-3.5 w-3.5 shrink-0 text-app-muted" aria-label="رسید دارد" />}
                    </span>
                    <span className="block truncate text-xs text-app-muted">
                      {shortDate(e.spentAt)}
                      <Sep />
                      {e.description}
                    </span>
                  </span>
                  <span className="shrink-0 font-black text-app-ink">{formatToman(e.amountToman)}</span>
                </button>
              ))}
            </div>
          )}
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-3xl border border-app-line bg-app-card p-1.5 shadow-app">
              {/* RTL: the previous page sits on the right. */}
              <button
                type="button"
                aria-label="صفحه قبل"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-app-ink transition active:scale-90 disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
              <span className="text-sm font-bold text-app-muted">
                صفحه {toPersianDigits(page)} از {toPersianDigits(pages)}
              </span>
              <button
                type="button"
                aria-label="صفحه بعد"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-app-ink transition active:scale-90 disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}

      {sheet && token && (
        <ExpenseSheet
          key={sheet.n}
          token={token}
          expense={sheet.expense}
          periodFrom={period.from}
          periodTo={period.to}
          onClose={() => setSheet(null)}
          onSaved={() => setRetry((r) => r + 1)}
        />
      )}
    </>
  );
}

function ExpenseSheet({
  token,
  expense,
  periodFrom,
  periodTo,
  onClose,
  onSaved,
}: {
  token: string;
  expense: StylistExpense | null;
  periodFrom: string;
  periodTo: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  // A new expense is dated inside the month on screen (today at the latest); an existing one can
  // move to any past day in the last year, or back to its own date if that's older.
  const todayKey = toSalonWallTime(new Date()).dateKey;
  const lastKey = addDaysToDateKey(instantToDayKey(periodTo), -1);
  const toKey = expense || lastKey > todayKey ? todayKey : lastKey;
  const yearAgoKey = addDaysToDateKey(todayKey, -365);
  const ownKey = expense ? instantToDayKey(expense.spentAt) : null;
  const fromKey = ownKey ? (ownKey < yearAgoKey ? ownKey : yearAgoKey) : instantToDayKey(periodFrom);
  const [category, setCategory] = useState<StylistExpenseCategory>(expense?.category ?? "SUPPLIES");
  const [amount, setAmount] = useState<number | null>(expense?.amountToman ?? null);
  const [dayKey, setDayKey] = useState(expense ? instantToDayKey(expense.spentAt) : toKey);
  const [description, setDescription] = useState(expense?.description ?? "");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense?.receiptUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Receipts uploaded in this sheet; whichever isn't saved is released on close.
  const uploaded = useRef<string[]>([]);
  // The server only serves a receipt once a saved expense owns it, so a just-picked one is shown
  // from the phone's own copy.
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  useEffect(() => () => void (localPreview && URL.revokeObjectURL(localPreview)), [localPreview]);
  const previewSrc = receiptUrl && localPreview ? localPreview : receiptUrl;

  function close() {
    releaseUploads(uploaded.current);
    onClose();
  }

  async function pickReceipt(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file, "expenses");
      uploaded.current.push(url);
      setReceiptUrl(url);
      setLocalPreview(URL.createObjectURL(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "آپلود رسید انجام نشد");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save() {
    if (!amount) return setError("مبلغ هزینه را وارد کنید");
    if (!description.trim()) return setError("توضیح هزینه را بنویسید");
    setBusy("save");
    setError(null);
    try {
      const data = { category, amountToman: amount, spentAt: dayKeyToInstant(dayKey), description: description.trim(), receiptUrl };
      if (expense) await updateMyExpense(token, expense.id, data);
      else await createMyExpense(token, data);
      // The saved receipt stays; the replaced one and any other uploads here are released.
      uploaded.current = [...uploaded.current, expense?.receiptUrl ?? ""].filter((u) => u && u !== receiptUrl);
      onSaved();
      close();
    } catch (err) {
      setError(persianApiError(err, "ذخیره هزینه انجام نشد"));
      setBusy(null);
    }
  }

  async function remove() {
    if (!expense) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy("delete");
    try {
      await deleteMyExpense(token, expense.id);
      uploaded.current = [...uploaded.current, expense.receiptUrl ?? ""];
      onSaved();
      close();
    } catch (err) {
      setError(persianApiError(err, "حذف هزینه انجام نشد"));
      setBusy(null);
    }
  }

  return (
    <Sheet
      open
      onClose={() => !busy && !uploading && close()}
      title={expense ? "ویرایش هزینه" : "هزینه جدید"}
      footer={
        <Button block busy={busy === "save"} disabled={busy !== null || uploading} onClick={save}>
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
                {STYLIST_EXPENSE_CATEGORY_LABEL[c]}
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
        <Field label="توضیح">
          <TextArea
            rows={2}
            value={description}
            maxLength={300}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="مثلاً رنگ مو و اکسیدان برای یک ماه"
          />
        </Field>

        <div>
          <p className="mb-1.5 px-1 text-[13px] font-bold text-app-muted">رسید یا فاکتور (اختیاری)</p>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => pickReceipt(e.target.files?.[0])} />
          {receiptUrl ? (
            <div className="relative overflow-hidden rounded-2xl border border-app-line bg-app-card-2">
              <a href={previewSrc ?? receiptUrl} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewSrc ?? receiptUrl} alt="رسید هزینه" className="max-h-56 w-full object-contain" />
              </a>
              <button
                type="button"
                aria-label="حذف رسید"
                onClick={() => {
                  setReceiptUrl(null);
                  setLocalPreview(null);
                }}
                className="absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white active:scale-90"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <Button variant="secondary" block icon={ImagePlus} busy={uploading} onClick={() => fileInput.current?.click()}>
              افزودن عکس رسید
            </Button>
          )}
        </div>

        {error && <p className="text-sm font-medium text-app-danger">{error}</p>}
        {expense && (
          <Button variant="danger" block icon={Trash2} busy={busy === "delete"} disabled={busy !== null} onClick={remove}>
            {confirmDelete ? "بله، این هزینه حذف شود" : "حذف هزینه"}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
