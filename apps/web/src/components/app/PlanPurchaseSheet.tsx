"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Sheet from "./Sheet";
import { Button, cx } from "./ui";
import WalletTopUp from "./WalletTopUp";
import { getPurchasablePlans, purchasePlan, type OwnerSubscription, type PurchasablePlan } from "@/lib/api/ownerSalon";
import { getWallet } from "@/lib/api/wallet";
import { persianApiError } from "@/lib/api/errorMessages";
import { formatToman, toPersianDigits } from "@/lib/persian";
import { toastError } from "@/lib/toastError";

// Buy or renew the salon's plan from the owner's wallet (apps/api POST salons/mine/subscription/purchase).
// Renewing the current plan adds to its end; another plan starts today and the unused part of the
// running bought plan comes back to the wallet first (pro rata). A month is 30 days.

const MONTHS = [1, 3, 6, 12] as const;

export default function PlanPurchaseSheet({ token, sub, open, onClose, onBought }: {
  token: string; sub: OwnerSubscription | null; open: boolean; onClose: () => void; onBought: () => void;
}) {
  const [plans, setPlans] = useState<PurchasablePlan[] | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [switchCredit, setSwitchCredit] = useState(0);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [months, setMonths] = useState<number>(1);
  const [busy, setBusy] = useState(false);

  const loadBalance = useCallback(() => {
    getWallet(token).then((w) => setBalance(w.balanceToman)).catch(() => setBalance(null));
  }, [token]);
  useEffect(() => {
    if (!open) return;
    getPurchasablePlans(token)
      .then(({ plans: p, currentPlanId: current, switchCreditToman }) => {
        setPlans(p);
        setSwitchCredit(switchCreditToman);
        setCurrentPlanId(current);
        setPlanId((cur) => cur ?? (p.find((x) => x.id === sub?.plan?.id) ?? p.find((x) => x.recommended) ?? p[0])?.id ?? null);
      })
      .catch(() => setPlans([]));
    loadBalance();
  }, [open, token, sub?.plan?.id, loadBalance]);

  const plan = plans?.find((p) => p.id === planId) ?? null;
  const total = plan ? plan.monthlyPriceToman * months : 0;
  // another plan: the running one's unused part is credited first, so it counts toward the price
  const credit = plan && currentPlanId && plan.id !== currentPlanId ? switchCredit : 0;
  const short = balance !== null && plan ? Math.max(0, total - credit - balance) : 0;
  const renewing = plan && sub?.plan?.id === plan.id && sub.status === "active";

  async function buy() {
    if (!plan) return;
    setBusy(true);
    try {
      const r = await purchasePlan(token, plan.id, months);
      toast.success(
        `پلن ${r.planName} برای ${toPersianDigits(r.months)} ماه خریده شد` + (r.creditToman > 0 ? `؛ ${formatToman(r.creditToman)} از پلن قبلی به کیف پول برگشت` : ""),
      );
      onBought();
      onClose();
    } catch (err) {
      toastError(persianApiError(err, "خرید پلن انجام نشد"));
      loadBalance();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => !busy && onClose()}
      title="خرید یا تمدید پلن"
      footer={
        <Button block busy={busy} disabled={!plan || balance === null || short > 0} onClick={buy}>
          {plan ? `پرداخت ${formatToman(total)} از کیف پول` : "یک پلن انتخاب کنید"}
        </Button>
      }
    >
      {!plans ? (
        <p className="text-sm text-app-muted">در حال بارگذاری…</p>
      ) : plans.length === 0 ? (
        <p className="text-sm leading-7 text-app-muted">فعلاً پلنی برای خرید آنلاین نیست؛ با پشتیبانی تماس بگیرید.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            {plans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlanId(p.id)}
                aria-pressed={planId === p.id}
                className={cx("flex items-center justify-between rounded-2xl border px-4 py-3 text-start", planId === p.id ? "border-app-accent bg-app-accent-soft" : "border-app-line bg-app-card")}
              >
                <span className="font-bold text-app-ink">
                  {p.name}
                  {sub?.plan?.id === p.id && <span className="ms-2 text-xs font-normal text-app-muted">پلن فعلی</span>}
                </span>
                <span className="text-sm text-app-muted">{p.monthlyPriceToman === 0 ? "رایگان" : `${formatToman(p.monthlyPriceToman)} در ماه`}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                aria-pressed={months === m}
                className={cx("h-11 rounded-2xl text-sm font-bold", months === m ? "bg-app-ink text-app-bg" : "border border-app-line bg-app-card text-app-muted")}
              >
                {toPersianDigits(m)} ماه
              </button>
            ))}
          </div>
          {plan && (
            <div className="space-y-1 rounded-2xl bg-app-card-2 p-3.5 text-sm">
              <p className="flex justify-between font-bold text-app-ink"><span>مبلغ</span><span>{formatToman(total)}</span></p>
              {credit > 0 && (
                <p className="flex justify-between text-app-done"><span>اعتبار باقی‌مانده پلن فعلی</span><span>{formatToman(credit)}</span></p>
              )}
              <p className="flex justify-between text-app-muted"><span>موجودی کیف پول</span><span>{balance === null ? "…" : formatToman(balance)}</span></p>
              <p className="pt-1 text-xs leading-6 text-app-muted">
                {renewing
                  ? "به انتهای اشتراک فعلی اضافه می‌شود."
                  : credit > 0
                    ? "از امروز شروع می‌شود؛ بخش استفاده‌نشده پلن فعلی به کیف پول برمی‌گردد."
                    : "از امروز شروع می‌شود."}{" "}
                هر ماه ۳۰ روز است.
              </p>
            </div>
          )}
          {short > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-bold text-app-ink">موجودی کافی نیست؛ حداقل {formatToman(short)} شارژ کنید.</p>
              <WalletTopUp suggestedToman={Math.max(10_000, Math.ceil(short / 1000) * 1000)} onPaid={loadBalance} />
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
