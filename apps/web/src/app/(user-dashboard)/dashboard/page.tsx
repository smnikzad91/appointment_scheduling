"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CalendarDays, ChevronLeft, LifeBuoy, ShieldCheck, Sparkles, UserRound, Wallet } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { useWallet } from "@/context/WalletContext";
import { getMyBookings, type CustomerBooking } from "@/lib/api/customerBookings";
import { formatMinutesAsClock, formatToman } from "@/lib/persian";
import { toSalonWallTime } from "@/lib/salonTime";
import { relativeDayLabel } from "@/components/app/appointments";
import { ListGroup, SectionTitle } from "@/components/app/ui";

export default function CustomerHomePage() {
  const { data: session } = useSession();
  const token = useApiAccessToken();
  const { balance } = useWallet();
  const [bookings, setBookings] = useState<CustomerBooking[] | null>(null);

  useEffect(() => {
    if (!token) return;
    getMyBookings(token)
      .then(setBookings)
      .catch(() => setBookings([]));
  }, [token]);

  const firstName = (session?.user?.name ?? "").split(" ")[0];
  const now = new Date().toISOString();
  const next = bookings
    ?.filter((b) => (b.status === "PENDING" || b.status === "CONFIRMED") && b.startAt >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  const nextWall = next ? toSalonWallTime(next.startAt) : null;

  const links = [
    { href: "/dashboard/bookings", label: "نوبت‌های من", icon: CalendarDays },
    { href: "/dashboard/finance", label: "کیف پول و کارت‌ها", icon: Wallet },
    { href: "/dashboard/support", label: "پشتیبانی", icon: LifeBuoy },
    { href: "/dashboard/profile", label: "ویرایش پروفایل", icon: UserRound },
    { href: "/dashboard/account", label: "امنیت و رمز عبور", icon: ShieldCheck },
  ];

  return (
    <>
      <h1 className="mb-4 text-[26px] font-black leading-tight text-app-ink">
        سلام{firstName ? `، ${firstName}` : ""}
      </h1>

      {/* Next booking */}
      <section className="relative overflow-hidden rounded-[32px] bg-[#2a1d26] p-5 text-[#f8f1e9] shadow-app dark:bg-[#33232f] dark:ring-1 dark:ring-app-line">
        <span className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-36 rounded-t-full border-[10px] border-app-accent/35" aria-hidden />
        {bookings === null ? (
          <div className="h-24 animate-pulse rounded-2xl bg-white/10" />
        ) : next && nextWall ? (
          <Link href="/dashboard/bookings" className="relative block active:opacity-80">
            <p className="text-xs text-white/60">نوبت بعدی شما · {relativeDayLabel(nextWall.dateKey)}</p>
            <p className="mt-1 flex items-center gap-2 text-[30px] font-black leading-tight">
              {formatMinutesAsClock(nextWall.minuteOfDay)}
              <ChevronLeft className="h-5 w-5 text-white/50" aria-hidden />
            </p>
            <p className="truncate text-sm font-semibold text-white/85">{next.salon.name}</p>
            <p className="truncate text-sm text-white/65">
              {next.services.map((s) => s.service.name).join("، ")} · {next.stylist.displayName}
            </p>
          </Link>
        ) : (
          <div className="relative">
            <Sparkles className="mb-2 h-6 w-6 text-app-accent" aria-hidden />
            <p className="font-bold">نوبت پیش‌رویی ندارید</p>
            <p className="mt-1 text-sm leading-6 text-white/65">از لینک صفحه سالن مورد علاقه‌تان آنلاین نوبت بگیرید.</p>
          </div>
        )}
      </section>

      {/* Wallet */}
      <Link
        href="/dashboard/finance"
        className="mt-3 flex items-center gap-3 rounded-3xl border border-app-line bg-app-card p-4 shadow-app active:scale-[0.99]"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent-soft text-app-accent">
          <Wallet className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-xs text-app-muted">موجودی کیف پول</span>
          <span className="block text-lg font-black text-app-ink">{balance === null ? "—" : formatToman(balance)}</span>
        </span>
        <span className="rounded-full bg-app-accent px-4 py-2 text-sm font-bold text-app-accent-ink">افزایش</span>
      </Link>

      <SectionTitle>دسترسی سریع</SectionTitle>
      <ListGroup>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="flex h-14 items-center gap-3 px-4 text-[15px] font-semibold text-app-ink active:bg-app-card-2">
            <link.icon className="h-5 w-5 text-app-muted" aria-hidden />
            <span className="flex-1">{link.label}</span>
            <ChevronLeft className="h-4 w-4 text-app-muted" aria-hidden />
          </Link>
        ))}
      </ListGroup>
    </>
  );
}
