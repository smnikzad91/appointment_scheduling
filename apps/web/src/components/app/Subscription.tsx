"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, MessageSquareText, Users } from "lucide-react";
import { getMySubscription, type OwnerSubscription } from "@/lib/api/ownerSalon";
import { planPriceLabel, SMS_BILLING_NOTE } from "@/lib/pricing";
import { toPersianDigits } from "@/lib/persian";
import { formatSalonDate } from "@/lib/salonTime";
import { Button, Card, cx } from "@/components/app/ui";
import PlanPurchaseSheet from "@/components/app/PlanPurchaseSheet";

// The salon's plan and limits (apps/api src/subscriptions). The owner buys or renews a plan from
// their wallet (PlanPurchaseSheet); the platform admin can still set one by hand.

const DAY_MS = 86_400_000;
const SOON_DAYS = 7;

/** Loads the owner's subscription; null while loading or if it failed (the UI just hides). */
export function useMySubscription(token: string | null | undefined, reloadKey?: unknown) {
  // reloadKey: bump it to re-read (e.g. after buying a plan)
  const [sub, setSub] = useState<OwnerSubscription | null>(null);
  useEffect(() => {
    if (!token) return;
    getMySubscription(token).then(setSub).catch(() => setSub(null));
  }, [token, reloadKey]);
  return sub;
}

function daysUntil(at: string | null): number | null {
  if (!at) return null;
  return Math.max(0, Math.ceil((new Date(at).getTime() - Date.now()) / DAY_MS));
}

const daysLeft = (sub: OwnerSubscription) => daysUntil(sub.expiresAt);

/** The free month runs and nothing is bought after it: online booking closes when it ends. */
const trialOnly = (sub: OwnerSubscription) => !!sub.trialEndsAt && sub.expiresAt === sub.trialEndsAt;

export function stylistSeatsFull(sub: OwnerSubscription | null): boolean {
  return !!sub && sub.stylists.limit !== null && sub.stylists.active >= sub.stylists.limit;
}

function Meter({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 100;
  return (
    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-app-line">
      <span className={cx("block h-full rounded-full", pct >= 100 ? "bg-app-danger" : "bg-app-accent")} style={{ width: `${pct}%` }} />
    </span>
  );
}

function Usage({ icon: Icon, label, used, limit, none }: { icon: typeof Users; label: string; used: number; limit: number | null; none?: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-app-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-app-ink">{label}</span>
          <span className="shrink-0 text-app-muted">
            {limit === null ? `${toPersianDigits(used)} (نامحدود)` : limit === 0 && none ? none : `${toPersianDigits(used)} از ${toPersianDigits(limit)}`}
          </span>
        </div>
        {limit !== null && limit > 0 && <Meter used={used} limit={limit} />}
      </div>
    </div>
  );
}

/** Settings page: plan, end date and how much of each limit is used. */
export function SubscriptionCard({ sub, className, token, onChanged }: { sub: OwnerSubscription | null; className?: string; token?: string | null; onChanged?: () => void }) {
  const [buying, setBuying] = useState(false);
  if (!sub) return null;
  const buy = token && (
    <>
      <Button block variant="secondary" onClick={() => setBuying(true)}>
        {sub.status === "none" || !sub.plan ? "خرید پلن از کیف پول" : "تمدید یا تغییر پلن از کیف پول"}
      </Button>
      <PlanPurchaseSheet token={token} sub={sub} open={buying} onClose={() => setBuying(false)} onBought={() => onChanged?.()} />
    </>
  );
  if (sub.status === "none" || !sub.plan) {
    return (
      <Card className={cx("flex flex-col gap-3 p-4 text-sm leading-7 text-app-muted", className)}>
        <p>
          هنوز پلنی برای سالن شما ثبت نشده و فعلاً محدودیتی ندارید.{" "}
          <Link href="/#pricing" className="font-bold text-app-accent">
            دیدن پلن‌ها
          </Link>
        </p>
        {buy}
      </Card>
    );
  }

  const price = planPriceLabel(sub.plan.monthlyPriceToman);
  const left = daysLeft(sub);
  return (
    <Card className={cx("flex flex-col gap-4 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-black text-app-ink">پلن {sub.plan.name}</p>
          <p className="text-sm text-app-muted">
            {price.amount}
            {price.perMonth && " تومان در ماه"}
          </p>
        </div>
        <span
          className={cx(
            "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
            sub.status === "expired" ? "bg-app-danger/15 text-app-danger" : "bg-app-accent-soft text-app-accent",
          )}
        >
          {sub.status === "expired" ? "منقضی شده" : sub.trialEndsAt ? "ماه رایگان" : "فعال"}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <CalendarClock className="h-5 w-5 shrink-0 text-app-muted" aria-hidden />
        <span className="text-app-ink">
          {!sub.expiresAt
            ? "بدون تاریخ پایان"
            : sub.status === "expired"
              ? `پایان یافته در ${formatSalonDate(sub.expiresAt)}؛ نوبت‌دهی آنلاین تا تمدید بسته است`
              : sub.trialEndsAt
                ? `رایگان تا ${formatSalonDate(sub.trialEndsAt)} (${toPersianDigits(daysUntil(sub.trialEndsAt) ?? 0)} روز مانده)` +
                  (trialOnly(sub) ? "" : `، سپس پرداخت‌شده تا ${formatSalonDate(sub.expiresAt)}`)
                : `تا ${formatSalonDate(sub.expiresAt)} (${toPersianDigits(left ?? 0)} روز مانده)`}
        </span>
      </div>
      {trialOnly(sub) && (
        <p className="-mt-2 ps-8 text-xs leading-6 text-app-muted">
          همه امکانات این پلن در ماه رایگان باز است. برای این‌که نوبت‌دهی آنلاین بعد از آن بسته نشود، پلن را از کیف پول بخرید؛ دوره پولی از پایان ماه رایگان شروع می‌شود.
        </p>
      )}

      <Usage icon={Users} label="آرایشگر فعال" used={sub.stylists.active} limit={sub.stylists.limit} />
      <Usage icon={MessageSquareText} label="پیامک این ماه" used={sub.sms.sent} limit={sub.sms.limit} none="در این پلن نیست" />
      {sub.sms.limit !== 0 && (
        <p className="-mt-2 ps-8 text-xs leading-6 text-app-muted">
          {SMS_BILLING_NOTE} تا ۱۰٬۰۰۰ تومان بدهی، پیامک‌ها ارسال می‌شوند؛ بعد از آن تا شارژ کیف پول متوقف می‌شوند و به آرایشگر پیامک داده می‌شود. هزینه‌ها در «کیف پول» دیده می‌شوند.
        </p>
      )}

      {buy || (
        <p className="text-xs leading-6 text-app-muted">
          برای تمدید یا تغییر پلن{" "}
          <Link href="/contact" className="font-bold text-app-accent">
            با پشتیبانی تماس بگیرید
          </Link>
          .
        </p>
      )}
    </Card>
  );
}

/** Home / stylists pages: only when something needs the owner's attention. */
export function SubscriptionNotice({ sub, seats, className }: { sub: OwnerSubscription | null; seats?: boolean; className?: string }) {
  if (!sub || sub.status === "none") return null;
  const left = daysLeft(sub);
  let text: string | null = null;
  if (sub.status === "expired") {
    text = "اشتراک به پایان رسیده است؛ تا تمدید (از کیف پول، در تنظیمات)، مشتری‌ها نمی‌توانند آنلاین نوبت بگیرند و افزودن آرایشگر ممکن نیست. نوبت‌گرفتن توسط خود شما ادامه دارد.";
  } else if (left !== null && left <= SOON_DAYS) {
    text = trialOnly(sub)
      ? `${toPersianDigits(left)} روز از ماه رایگان مانده است؛ برای باز ماندن نوبت‌دهی آنلاین، پلن را از کیف پول بخرید.`
      : `${toPersianDigits(left)} روز تا پایان اشتراک مانده است؛ بعد از آن نوبت‌دهی آنلاین تا تمدید بسته می‌شود.`;
  } else if (seats && stylistSeatsFull(sub)) {
    text = `ظرفیت آرایشگر پلن ${sub.plan?.name ?? ""} پر است (${toPersianDigits(sub.stylists.limit ?? 0)} آرایشگر فعال). برای افزودن، یک آرایشگر را غیرفعال کنید یا پلن را ارتقا دهید.`;
  }
  if (!text) return null;

  return (
    <div role="status" className={cx("flex items-start gap-3 rounded-3xl border border-app-pending/30 bg-app-pending/10 p-4", className)}>
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-app-pending" aria-hidden />
      <p className="text-sm leading-7 text-app-ink">
        {text}{" "}
        <Link href="/salon/settings#subscription" className="font-bold text-app-accent">
          جزئیات
        </Link>
      </p>
    </div>
  );
}
