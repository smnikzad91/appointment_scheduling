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
import { useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import AppShell from "./AppShell";

// One wrapper per panel so server layouts can render the shell without passing icon components
// (functions) across the server/client boundary.

export function SalonShell({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      panelName="پنل سالن"
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
  return (
    <AppShell
      panelName="پنل آرایشگر"
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
  const { lang, setLang } = useLanguage();
  // Customers are all in Iran and the panel's shell is Persian; the shared language preference
  // defaults to English (for the admin panel), so switch it here.
  useEffect(() => {
    if (lang !== "fa") setLang("fa");
  }, [lang, setLang]);

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
