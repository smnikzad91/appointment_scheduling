"use client";

import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  Clock3,
  Home,
  LifeBuoy,
  Scissors,
  Search,
  Settings,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { SALON_UPDATED_EVENT, getMySalon } from "@/lib/api/ownerSalon";
import { STYLIST_UPDATED_EVENT, getMyStylistProfile } from "@/lib/api/stylistSelf";
import { isIndependent } from "@/lib/independent";
import AppShell, { type ShellIdentity } from "./AppShell";
import NotificationBell from "./NotificationBell";

// One wrapper per panel so server layouts can render the shell without passing icon components
// (functions) across the server/client boundary.

/**
 * The owner's app bar shows the salon (logo + name) rather than the owner's personal account.
 * Also tells an independent stylist's business apart, whose panel has no stylists tab.
 */
function useSalonIdentity(token: string | null): { identity: ShellIdentity | null; independent: boolean } {
  const [identity, setIdentity] = useState<ShellIdentity | null>(null);
  const [independent, setIndependent] = useState(false);
  useEffect(() => {
    if (!token) return;
    const load = () =>
      getMySalon(token)
        .then((s) => {
          setIdentity({ name: s.name, src: s.logoUrl, shape: "square" });
          setIndependent(isIndependent(s));
        })
        .catch(() => {}); // keep the account avatar if this fails
    load();
    window.addEventListener(SALON_UPDATED_EVENT, load);
    return () => window.removeEventListener(SALON_UPDATED_EVENT, load);
  }, [token]);
  return { identity, independent };
}

/**
 * The stylist's app bar shows their live profile (name + photo) rather than the login session,
 * which only knows the photo from sign-in: the salon owner can change it at any time. Reloaded
 * after the stylist edits their profile and whenever the app comes back to the foreground.
 */
function useStylistIdentity(token: string | null): ShellIdentity | null {
  const [identity, setIdentity] = useState<ShellIdentity | null>(null);
  useEffect(() => {
    if (!token) return;
    const load = () =>
      getMyStylistProfile(token)
        .then((s) => setIdentity({ name: s.displayName, src: s.avatarUrl, shape: "circle" }))
        .catch(() => {}); // keep the account avatar if this fails
    const onVisible = () => document.visibilityState === "visible" && load();
    load();
    window.addEventListener(STYLIST_UPDATED_EVENT, load);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(STYLIST_UPDATED_EVENT, load);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token]);
  return identity;
}

export function SalonShell({ children }: { children: React.ReactNode }) {
  const token = useApiAccessToken();
  const { identity, independent } = useSalonIdentity(token);
  return (
    <AppShell
      panelName={independent ? "پنل آرایشگر مستقل" : "پنل سالن"}
      identity={identity}
      actions={<NotificationBell token={token} scope="salon" />}
      tabs={[
        { href: "/salon", label: "خانه", icon: Home, exact: true },
        { href: "/salon/appointments", label: "نوبت‌ها", icon: CalendarClock },
        { href: "/salon/services", label: "خدمات", icon: Scissors },
        // An independent stylist works alone: their own hours instead of a stylists list.
        independent
          ? { href: "/salon/schedule", label: "ساعات کاری", icon: Clock3 }
          : { href: "/salon/stylists", label: "آرایشگرها", icon: Users },
        { href: "/salon/settings", label: "تنظیمات", icon: Settings },
      ]}
      accountLinks={[{ href: "/tutorials?role=owner", label: "راهنمای استفاده", icon: BookOpen }]}
    >
      {children}
    </AppShell>
  );
}

export function StylistShell({ children }: { children: React.ReactNode }) {
  const token = useApiAccessToken();
  const identity = useStylistIdentity(token);
  return (
    <AppShell
      panelName="پنل آرایشگر"
      identity={identity}
      actions={<NotificationBell token={token} scope="stylist" />}
      tabs={[
        { href: "/stylist", label: "امروز", icon: Home, exact: true },
        { href: "/stylist/appointments", label: "نوبت‌ها", icon: CalendarClock },
        { href: "/stylist/schedule", label: "ساعات کاری", icon: Clock3 },
        { href: "/stylist/services", label: "خدمات", icon: Scissors },
        { href: "/stylist/profile", label: "پروفایل", icon: UserRound },
      ]}
      accountLinks={[{ href: "/tutorials?role=stylist", label: "راهنمای استفاده", icon: BookOpen }]}
    >
      {children}
    </AppShell>
  );
}

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const token = useApiAccessToken();
  return (
    <AppShell
      panelName="حساب مشتری"
      actions={<NotificationBell token={token} scope="customer" />}
      tabs={[
        { href: "/dashboard", label: "خانه", icon: Home, exact: true },
        { href: "/dashboard/discover", label: "کشف سالن", icon: Search },
        { href: "/dashboard/bookings", label: "نوبت‌ها", icon: CalendarDays },
        { href: "/dashboard/finance", label: "کیف پول", icon: Wallet },
        { href: "/dashboard/profile", label: "پروفایل", icon: UserRound },
      ]}
      accountLinks={[
        { href: "/dashboard/support", label: "پشتیبانی", icon: LifeBuoy },
        { href: "/dashboard/account", label: "امنیت و رمز عبور", icon: Settings },
        { href: "/tutorials?role=customer", label: "راهنمای استفاده", icon: BookOpen },
      ]}
    >
      {children}
    </AppShell>
  );
}
