"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Home, LifeBuoy, Search, UserRound } from "lucide-react";

// Phone bottom bar for the public site — same shape as the panels' tab bar (AppShell), in the
// guest theme. Not on /s/[slug] (its sticky «رزرو نوبت» bar sits there) or the auth screens.
// «حساب من» goes through /launch: signed-in users land in their own panel, others at sign-in.
const TABS = [
  { href: "/", label: "خانه", icon: Home, exact: true },
  { href: "/salons", label: "جستجوی سالن", icon: Search },
  { href: "/my-bookings", label: "نوبت‌های من", icon: CalendarCheck },
  { href: "/tutorials", label: "راهنما", icon: LifeBuoy },
  { href: "/launch", label: "حساب من", icon: UserRound },
];

export default function GuestTabBar() {
  const pathname = usePathname();
  const isActive = (t: (typeof TABS)[number]) => (t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`));

  return (
    <>
      {/* keeps the last content clear of the bar */}
      <div aria-hidden className="h-[calc(62px+env(safe-area-inset-bottom))] md:hidden" />
      <nav aria-label="پیمایش اصلی" className="app-pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-g-line bg-g-bg/75 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg px-2">
          {TABS.map((t) => {
            const active = isActive(t);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[62px] flex-1 select-none flex-col items-center justify-center gap-1 active:scale-95"
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-300 ${
                    active ? "bg-g-accent/15 text-g-accent shadow-[0_0_18px_-6px_rgb(242_135_106/0.8)]" : "text-g-faint"
                  }`}
                >
                  <t.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.8} aria-hidden />
                </span>
                <span className={`text-[11px] leading-none ${active ? "font-bold text-g-ink" : "font-medium text-g-faint"}`}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
