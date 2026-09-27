"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, MessageSquareText } from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/api/notifications";
import { toPersianDigits } from "@/lib/persian";
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

function title(n: AppNotification, scope: "salon" | "stylist") {
  const { customerName, target, stylistName, edited } = n.data;
  const about = target === "SALON" ? "سالن" : scope === "stylist" ? "شما" : stylistName ?? "آرایشگر";
  return edited ? `${customerName} نظرش درباره ${about} را ویرایش کرد` : `نظر تازه از ${customerName} درباره ${about}`;
}

/**
 * App-bar bell for the salon and stylist panels: unread badge, and a sheet listing recent
 * notifications. Tapping one marks it read and opens the page where it can be acted on.
 */
export default function NotificationBell({ token, scope }: { token: string | null; scope: "salon" | "stylist" }) {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const reviewsHref = scope === "salon" ? "/salon/reviews" : "/stylist/reviews";

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
    router.push(reviewsHref);
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
          <EmptyState icon={Bell} title="اعلانی ندارید" hint="وقتی مشتری‌ای نظر بدهد، اینجا خبرتان می‌کنیم." />
        ) : (
          <ul className="-mx-1 flex flex-col">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={cx("flex w-full items-start gap-3 rounded-2xl px-2 py-3 text-start active:bg-app-card-2", !n.readAt && "bg-app-accent-soft/50")}
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-app-card-2 text-app-accent">
                    <MessageSquareText className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cx("block text-[15px] leading-6 text-app-ink", !n.readAt ? "font-black" : "font-semibold")}>{title(n, scope)}</span>
                    {n.data.rating !== null && <Stars value={n.data.rating} size={13} emptyClassName="text-app-line" className="mt-1" />}
                    {n.data.excerpt && <span className="mt-0.5 line-clamp-2 block text-sm text-app-muted">{n.data.excerpt}</span>}
                    <span className="mt-1 block text-xs text-app-muted">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.readAt && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-app-danger" aria-label="خوانده‌نشده" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
