"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Bell, BellRing, CalendarCheck2, CalendarClock, CalendarPlus, CalendarX, CheckCheck, MessageSquareText, Wallet, type LucideIcon } from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/api/notifications";
import { formatToman, toPersianDigits } from "@/lib/persian";
import { formatSalonDateTime } from "@/lib/salonTime";
import { dateKeyToDate, formatJalaliFull } from "@/lib/jalali";
import { PAYOUT_METHOD_LABEL } from "@/lib/api/accounting";
import { Stars } from "@/components/common/StarRating";
import Sheet from "./Sheet";
import { EmptyState, cx } from "./ui";

const POLL_MS = 60_000;

const relative = new Intl.RelativeTimeFormat("fa", { numeric: "auto" });
function timeAgo(iso: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "همین حالا";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  return relative.format(Math.round(seconds / 86400), "day");
}

/** Installed-PWA icon badge, where the platform supports it. */
function setAppBadge(count: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  const p = count > 0 ? nav.setAppBadge?.(count) : nav.clearAppBadge?.();
  p?.catch(() => {});
}

type Scope = "salon" | "stylist" | "customer";

/** How each notification reads, which icon it gets, and where tapping it goes. */
function describe(n: AppNotification, scope: Scope): { icon: LucideIcon; tone: string; title: string; detail: string | null; href: string } {
  const appointmentsHref = scope === "salon" ? "/salon/appointments" : scope === "stylist" ? "/stylist/appointments" : "/dashboard/bookings";
  const salon = "salonName" in n.data && n.data.salonName ? n.data.salonName : "سالن";
  switch (n.type) {
    case "NEW_REVIEW": {
      const { customerName, target, stylistName, edited, independent } = n.data;
      const about = target === "SALON" ? (independent ? "شما" : "سالن") : scope === "stylist" ? "شما" : stylistName ?? "آرایشگر";
      return {
        icon: MessageSquareText,
        tone: "text-app-accent",
        title: edited ? `${customerName} نظرش درباره ${about} را ویرایش کرد` : `نظر تازه از ${customerName} درباره ${about}`,
        detail: n.data.excerpt,
        href: scope === "salon" ? "/salon/reviews" : "/stylist/reviews",
      };
    }
    case "NEW_BOOKING": {
      const { customerName, stylistName, bySalon } = n.data;
      return {
        icon: CalendarPlus,
        tone: "text-app-done",
        title:
          scope === "customer"
            ? `${salon} برای شما نوبتی با ${stylistName} ثبت کرد`
            : scope === "stylist"
            ? bySalon
              ? `سالن برای ${customerName} نوبتی با شما ثبت کرد`
              : `${customerName} با شما نوبت گرفت`
            : `نوبت تازه: ${customerName} با ${stylistName}`,
        detail: bookingDetail(n.data),
        href: appointmentsHref,
      };
    }
    case "BOOKING_CANCELLED": {
      const { customerName, stylistName, cancelledBy } = n.data;
      const who = cancelledBy === "CUSTOMER" ? customerName : cancelledBy === "STYLIST" ? stylistName : "سالن";
      const whose = scope === "stylist" ? `نوبت ${customerName}` : `نوبت ${customerName} با ${stylistName}`;
      // SYSTEM: an online booking nobody confirmed, cancelled a day after its time; pre-payment refunded
      if (cancelledBy === "SYSTEM") {
        const title = scope === "customer" ? `نوبت شما در ${salon} تایید نشد؛ پیش‌پرداخت به کیف پولتان برگشت` : `${whose} تایید نشد و خودکار لغو شد`;
        return { icon: CalendarX, tone: "text-app-danger", title, detail: bookingDetail(n.data), href: appointmentsHref };
      }
      const title =
        scope === "customer"
          ? cancelledBy === "STYLIST"
            ? `${stylistName} نوبت شما در ${salon} را لغو کرد`
            : `${salon} نوبت شما را لغو کرد`
          : `${who} ${whose} را لغو کرد`;
      return { icon: CalendarX, tone: "text-app-danger", title, detail: bookingDetail(n.data), href: appointmentsHref };
    }
    // the stylist asked for the rest of a completed booking from the customer's wallet (customer)
    case "BALANCE_REQUESTED":
      return {
        icon: Wallet,
        tone: "text-app-accent",
        title: `${salon}: باقی‌مانده نوبت ${formatToman(n.data.amountToman ?? 0)}؛ از کیف پول پرداخت کنید`,
        detail: bookingDetail(n.data),
        href: appointmentsHref,
      };
    // …and the customer paid it (owner, stylist)
    case "BALANCE_PAID":
      return {
        icon: Wallet,
        tone: "text-app-done",
        title: `${n.data.customerName} باقی‌مانده نوبت را از کیف پول پرداخت کرد (${formatToman(n.data.amountToman ?? 0)})`,
        detail: bookingDetail(n.data),
        href: scope === "stylist" ? "/stylist/wallet" : "/salon/wallet",
      };
    case "BOOKING_CONFIRMED":
      return {
        icon: CalendarCheck2,
        tone: "text-app-done",
        title: `${salon} نوبت شما با ${n.data.stylistName} را تایید کرد`,
        detail: bookingDetail(n.data),
        href: appointmentsHref,
      };
    case "BOOKING_UPDATED": {
      const { customerName, stylistName, updatedBy, previousStartAt, startAt } = n.data;
      const title =
        scope === "customer"
          ? updatedBy === "STYLIST"
            ? `${stylistName} نوبت شما در ${salon} را تغییر داد`
            : `${salon} نوبت شما با ${stylistName} را تغییر داد`
          : scope === "stylist"
          ? `سالن نوبت ${customerName} را تغییر داد`
          : `${stylistName} نوبت ${customerName} را تغییر داد`;
      const moved = previousStartAt && previousStartAt !== startAt ? ` (پیش‌تر ${formatSalonDateTime(previousStartAt)})` : "";
      return { icon: CalendarClock, tone: "text-app-accent", title, detail: bookingDetail(n.data) + moved, href: appointmentsHref };
    }
    case "SLOT_OPENED": {
      const d = n.data;
      const params = new URLSearchParams({ book: "1", services: d.serviceIds.join(","), date: d.dateKey, ...(d.stylistId && { stylist: d.stylistId }) });
      return {
        icon: BellRing,
        tone: "text-app-done",
        title: `وقت خالی در ${d.salonName}${d.stylistName ? ` با ${d.stylistName}` : ""}`,
        detail: `${formatJalaliFull(dateKeyToDate(d.dateKey))} — یک نوبت لغو شد؛ تا کسی دیگر نگرفته رزرو کنید.`,
        href: `/s/${d.salonSlug}?${params}`,
      };
    }
    case "REVIEW_APPROVED": {
      const about = n.data.target === "SALON" ? n.data.salonName : `${n.data.stylistName ?? "آرایشگر"} (${n.data.salonName})`;
      return {
        icon: BadgeCheck,
        tone: "text-app-done",
        title: `نظر شما درباره ${about} منتشر شد`,
        detail: "حالا در صفحه سالن برای همه نمایش داده می‌شود.",
        href: appointmentsHref,
      };
    }
    case "PAYOUT_RECORDED":
      return {
        icon: Wallet,
        tone: "text-app-done",
        title: `سالن ${formatToman(n.data.amountToman)} به شما پرداخت کرد`,
        detail: [PAYOUT_METHOD_LABEL[n.data.method], n.data.note].filter(Boolean).join("، "),
        href: n.data.method === "WALLET" ? "/stylist/wallet" : "/stylist/earnings",
      };
  }
}

function bookingDetail(d: { services: string[]; startAt: string }) {
  return `${formatSalonDateTime(d.startAt)}${d.services.length ? ` — ${d.services.join("، ")}` : ""}`;
}

/**
 * App-bar bell for the salon and stylist panels: unread badge, and a sheet listing recent
 * notifications. Tapping one marks it read and opens the page where it can be acted on.
 */
export default function NotificationBell({ token, scope }: { token: string | null; scope: Scope }) {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => {
    if (!token) return;
    listNotifications(token)
      .then((r) => {
        setItems(r.items);
        setUnread(r.unreadCount);
        setAppBadge(r.unreadCount);
      })
      .catch(() => {});
  }, [token]);

  // Poll while the app is in the foreground, and catch up as soon as it comes back.
  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function openItem(n: AppNotification) {
    setOpen(false);
    if (token && !n.readAt) {
      setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) ?? list);
      setUnread((u) => Math.max(0, u - 1));
      markNotificationRead(token, n.id).then(refresh).catch(() => {});
    }
    router.push(describe(n, scope).href);
  }

  async function readAll() {
    if (!token) return;
    setItems((list) => list?.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })) ?? list);
    setUnread(0);
    setAppBadge(0);
    await markAllNotificationsRead(token).catch(() => {});
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          refresh();
        }}
        aria-label={unread ? `اعلان‌ها — ${toPersianDigits(unread)} خوانده‌نشده` : "اعلان‌ها"}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-app-ink active:scale-90 active:bg-app-card-2"
      >
        <Bell className="h-[22px] w-[22px]" aria-hidden />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-app-danger px-1 text-[11px] font-black leading-none text-white ring-2 ring-app-bg">
            {unread > 99 ? "۹۹+" : toPersianDigits(unread)}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="اعلان‌ها">
        {unread > 0 && (
          <button
            type="button"
            onClick={readAll}
            className="-mt-2 mb-3 flex items-center gap-1.5 rounded-full px-1 text-sm font-bold text-app-accent active:opacity-70"
          >
            <CheckCheck className="h-4 w-4" aria-hidden />
            همه خوانده شد
          </button>
        )}

        {!items || items.length === 0 ? (
          <EmptyState icon={Bell} title="اعلانی ندارید" hint={
              scope === "salon"
                ? "نوبت‌های تازه، لغوها و نظرهای مشتری‌ها اینجا می‌آید."
                : scope === "stylist"
                  ? "نوبت‌های تازه، لغوها، پرداخت‌های سالن و نظرها اینجا می‌آید."
                  : "تایید یا لغو نوبت‌ها، وقت‌های خالی‌شده و انتشار نظرهایتان اینجا می‌آید."
            } />
        ) : (
          <ul className="-mx-1 flex flex-col">
            {items.map((n) => {
              const d = describe(n, scope);
              return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={cx("flex w-full items-start gap-3 rounded-2xl px-2 py-3 text-start active:bg-app-card-2", !n.readAt && "bg-app-accent-soft/50")}
                >
                  <span className={cx("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-app-card-2", d.tone)}>
                    <d.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx("block text-[15px] leading-6 text-app-ink", !n.readAt ? "font-black" : "font-semibold")}>{d.title}</span>
                    {n.type === "NEW_REVIEW" && n.data.rating !== null && <Stars value={n.data.rating} size={13} emptyClassName="text-app-line" className="mt-1" />}
                    {d.detail && <span className="mt-0.5 line-clamp-2 block text-sm text-app-muted">{d.detail}</span>}
                    <span className="mt-1 block text-xs text-app-muted">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.readAt && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-app-danger" aria-label="خوانده‌نشده" />}
                </button>
              </li>
              );
            })}
          </ul>
        )}
      </Sheet>
    </>
  );
}
