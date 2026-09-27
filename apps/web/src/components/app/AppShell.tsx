"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Moon, Sun, type LucideIcon } from "lucide-react";
import { vazirmatn } from "@/fonts/vazirmatn";
import { useTheme } from "@/context/ThemeContext";
import { SITE_NAME } from "@/lib/site";
import Sheet from "./Sheet";
import { Avatar, ListGroup, cx } from "./ui";

export interface AppTab {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only active on an exact path match (for a panel's home tab). */
  exact?: boolean;
}

export interface AccountLink {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
}

/**
 * Phone-first app frame for the salon, stylist and customer panels: a sticky app bar, a
 * single-column content area capped at phone width (so it still reads as an app on a tablet or
 * desktop), and a bottom tab bar — all padded for the notch and home indicator.
 */
export default function AppShell({
  panelName,
  tabs,
  accountLinks = [],
  children,
}: {
  panelName: string;
  tabs: AppTab[];
  accountLinks?: AccountLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (tab: AppTab) => (tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(`${tab.href}/`));
  const userName = session?.user?.name ?? "";

  return (
    <div dir="rtl" className={`app-root ${vazirmatn.variable} min-h-dvh`}>
      {/* App bar */}
      <header
        className={cx(
          "app-pt-safe sticky top-0 z-40 bg-app-bg/85 backdrop-blur-xl transition-[border-color,box-shadow]",
          scrolled ? "border-b border-app-line shadow-[0_6px_20px_-16px_rgb(0_0_0/0.4)]" : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-app-accent text-lg font-black text-app-accent-ink">
              {SITE_NAME.slice(0, 1)}
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-black text-app-ink">{SITE_NAME}</p>
              <p className="text-[11px] font-medium text-app-muted">{panelName}</p>
            </div>
          </div>
          <button type="button" onClick={() => setAccountOpen(true)} aria-label="حساب کاربری" className="rounded-full active:scale-90">
            <Avatar name={userName || "?"} src={session?.user?.avatar || null} size={38} className="ring-2 ring-app-card" />
          </button>
        </div>
      </header>

      {/* Content — keyed by path so every tab switch gets the same short entrance. */}
      <main key={pathname} className="app-rise mx-auto max-w-lg px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-3">
        {children}
      </main>

      {/* Tab bar */}
      <nav
        aria-label="منوی اصلی"
        className="app-pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-app-line bg-app-card/92 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-lg px-2">
          {tabs.map((tab) => {
            const active = isActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-[62px] flex-1 select-none flex-col items-center justify-center gap-1 active:scale-95"
              >
                <span
                  className={cx(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-300",
                    active ? "bg-app-accent-soft text-app-accent" : "text-app-muted",
                  )}
                >
                  <tab.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.3 : 1.8} aria-hidden />
                </span>
                <span className={cx("text-[11px] leading-none", active ? "font-bold text-app-ink" : "font-medium text-app-muted")}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Sheet open={accountOpen} onClose={() => setAccountOpen(false)} title="حساب کاربری">
        <div className="mb-5 flex items-center gap-3">
          <Avatar name={userName || "?"} src={session?.user?.avatar || null} size={56} />
          <div className="min-w-0">
            <p className="truncate text-base font-black text-app-ink">{userName}</p>
            <p className="text-sm text-app-muted">{panelName}</p>
          </div>
        </div>

        <ListGroup>
          {accountLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              onClick={() => setAccountOpen(false)}
              className="flex h-14 items-center gap-3 px-4 text-[15px] font-semibold text-app-ink active:bg-app-card-2"
            >
              <link.icon className="h-5 w-5 text-app-muted" aria-hidden />
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-14 w-full items-center gap-3 px-4 text-[15px] font-semibold text-app-ink active:bg-app-card-2"
          >
            {theme === "dark" ? <Sun className="h-5 w-5 text-app-muted" aria-hidden /> : <Moon className="h-5 w-5 text-app-muted" aria-hidden />}
            {theme === "dark" ? "حالت روشن" : "حالت تیره"}
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/signin" })}
            className="flex h-14 w-full items-center gap-3 px-4 text-[15px] font-semibold text-app-danger active:bg-app-card-2"
          >
            <LogOut className="h-5 w-5" aria-hidden />
            خروج از حساب
          </button>
        </ListGroup>
      </Sheet>
    </div>
  );
}
