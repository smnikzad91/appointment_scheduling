"use client";

import {
  CalendarClock,
  CalendarDays,
  Clock3,
  Home,
  LifeBuoy,
  Scissors,
  Settings,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { SALON_UPDATED_EVENT, getMySalon } from "@/lib/api/ownerSalon";
import AppShell, { type ShellIdentity } from "./AppShell";
import NotificationBell from "./NotificationBell";

// One wrapper per panel so server layouts can render the shell without passing icon components
// (functions) across the server/client boundary.

/** The owner's app bar shows the salon (logo + name) rather than the owner's personal account. */
function useSalonIdentity(token: string | null): ShellIdentity | null {
  const [identity, setIdentity] = useState<ShellIdentity | null>(null);
  useEffect(() => {
    if (!token) return;
    const load = () =>
      getMySalon(token)
        .then((s) => setIdentity({ name: s.name, src: s.logoUrl, shape: "square" }))
        .catch(() => {}); // keep the account avatar if this fails
    load();
    window.addEventListener(SALON_UPDATED_EVENT, load);
    return () => window.removeEventListener(SALON_UPDATED_EVENT, load);
  }, [token]);
  return identity;
}

export function SalonShell({ children }: { children: React.ReactNode }) {
  const token = useApiAccessToken();
  const identity = useSalonIdentity(token);
  return (
    <AppShell
      panelName="پنل سالن"
      identity={identity}
      actions={<NotificationBell token={token} scope="salon" />}
      tabs={[
        { href: "/salon", label: "خانه", icon: Home, exact: true },
        { href: "/salon/appointments", label: "نوبت‌ها", icon: CalendarClock },
        { href: "/salon/services", label: "خدمات", icon: Scissors },
        { href: "/salon/stylists", label: "آرایشگرها", icon: Users },
        { href: "/salon/settings", label: "تنظیمات", icon: Settings },
      ]}
    >
      {children}
    </AppShell>
  );
}

export function StylistShell({ children }: { children: React.ReactNode }) {
  const token = useApiAccessToken();
  return (
    <AppShell
      panelName="پنل آرایشگر"
      actions={<NotificationBell token={token} scope="stylist" />}
      tabs={[
        { href: "/stylist", label: "امروز", icon: Home, exact: true },
        { href: "/stylist/appointments", label: "نوبت‌ها", icon: CalendarClock },
        { href: "/stylist/schedule", label: "ساعات کاری", icon: Clock3 },
        { href: "/stylist/services", label: "خدمات", icon: Scissors },
        { href: "/stylist/profile", label: "پروفایل", icon: UserRound },
      ]}
    >
      {children}
    </AppShell>
  );
}

export function CustomerShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      panelName="حساب مشتری"
      tabs={[
        { href: "/dashboard", label: "خانه", icon: Home, exact: true },
        { href: "/dashboard/bookings", label: "نوبت‌ها", icon: CalendarDays },
        { href: "/dashboard/finance", label: "کیف پول", icon: Wallet },
        { href: "/dashboard/support", label: "پشتیبانی", icon: LifeBuoy },
        { href: "/dashboard/profile", label: "پروفایل", icon: UserRound },
      ]}
      accountLinks={[{ href: "/dashboard/account", label: "امنیت و رمز عبور", icon: Settings }]}
    >
      {children}
    </AppShell>
  );
}
