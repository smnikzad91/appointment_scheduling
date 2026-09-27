"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, CalendarClock, Scissors, Clock3, UserCircle, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/stylist", label: "داشبورد", icon: LayoutDashboard, exact: true },
  { href: "/stylist/appointments", label: "نوبت‌ها", icon: CalendarClock },
  { href: "/stylist/services", label: "خدمات", icon: Scissors },
  { href: "/stylist/schedule", label: "ساعات کاری", icon: Clock3 },
  { href: "/stylist/profile", label: "پروفایل", icon: UserCircle },
];

export default function StylistSidebar() {
  const pathname = usePathname();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
        <div>
          <span className="text-base font-bold text-brand-500">نوبتا</span>
          <span className="ms-1.5 text-xs text-gray-400">پنل آرایشگر</span>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          aria-label="خروج"
          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </button>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-800 dark:bg-gray-900">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition ${
                isActive ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
