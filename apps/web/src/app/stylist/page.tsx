"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReviewsLinkCard from "@/components/app/ReviewsLinkCard";
import { CalendarCheck2, CalendarClock, ChevronLeft, Clock3, Coffee, Hourglass, QrCode, Receipt, Wallet } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMyStylistProfile, listMyAppointments, updateMyAppointmentStatus, type SelfStylist, type StylistAppointment } from "@/lib/api/stylistSelf";
import { formatMinutesAsClock, formatToman } from "@/lib/persian";
import { toSalonWallTime } from "@/lib/salonTime";
import SalonBookingSheet from "@/components/app/SalonBookingSheet";
import { AppointmentCard, AppointmentSheet, TodayTimeline, relativeDayLabel, useAppointmentActions } from "@/components/app/appointments";
import { Avatar, EmptyState, ErrorBanner, ListSkeleton, SectionTitle, StatTile, LinkCard } from "@/components/app/ui";
import Sep from "@/components/common/Sep";

function greeting(minuteOfDay: number) {
  if (minuteOfDay < 12 * 60) return "صبح بخیر";
  if (minuteOfDay < 17 * 60) return "روز بخیر";
  return "عصر بخیر";
}

/**
 * The stylist's own take from an appointment: the frozen share (commission + tip) once it's
 * completed, otherwise their commission on each service's booked price — a service's own rate
 * where the owner set one, else their default — like apps/api's effectiveCommissionPercent.
 */
function estimatedShare(a: StylistAppointment, profile: SelfStylist) {
  if (a.status === "COMPLETED" && a.stylistShareToman != null) return a.stylistShareToman;
  const ownRate = new Map(profile.services.map((s) => [s.serviceId, s.commissionPercent]));
  const lines = a.services.length ? a.services : [{ serviceId: "", priceToman: a.priceToman }];
  return Math.round(lines.reduce((sum, l) => sum + l.priceToman * (ownRate.get(l.serviceId) ?? profile.commissionPercent), 0) / 100);
}

export default function StylistOverviewPage() {
  const token = useApiAccessToken();
  const [profile, setProfile] = useState<SelfStylist | null>(null);
  const [appointments, setAppointments] = useState<StylistAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!token) return;
    Promise.all([getMyStylistProfile(token), listMyAppointments(token)])
      .then(([p, a]) => {
        setError(null);
        setProfile(p);
        setAppointments(a);
      })
      .catch(() => setError("خطا در دریافت اطلاعات"));
  }, [token]);

  useEffect(reload, [reload]);

  const actions = useAppointmentActions(
    useCallback((id, status) => updateMyAppointmentStatus(token!, id, status), [token]),
    reload,
  );

  if (error && !profile) return <ErrorBanner onRetry={reload}>{error}</ErrorBanner>;
  if (!profile || !appointments) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-40 animate-pulse rounded-[32px] bg-app-card-2" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  const now = new Date();
  const nowWall = toSalonWallTime(now);
  const live = appointments.filter((a) => a.status === "PENDING" || a.status === "CONFIRMED");
  const today = appointments.filter((a) => a.status !== "CANCELLED" && toSalonWallTime(a.startAt).dateKey === nowWall.dateKey);
  const upcoming = live.filter((a) => new Date(a.startAt) >= now).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const pending = upcoming.filter((a) => a.status === "PENDING");
  const next = upcoming[0];
  const todayShare = today.filter((a) => a.status !== "NO_SHOW").reduce((sum, a) => sum + estimatedShare(a, profile), 0);
  const nextWall = next ? toSalonWallTime(next.startAt) : null;

  return (
    <>
      {/* Hero: who's next */}
      <section className="relative overflow-hidden rounded-[32px] bg-[#2a1d26] p-5 text-[#f8f1e9] shadow-app dark:bg-[#33232f] dark:ring-1 dark:ring-app-line">
        <span className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-36 rounded-t-full border-[10px] border-app-accent/35" aria-hidden />
        <div className="relative flex items-center gap-3">
          <Avatar name={profile.displayName} src={profile.avatarUrl} size={48} className="bg-white/15 text-white ring-2 ring-white/20" />
          <div>
            <p className="text-xs text-white/60">{greeting(nowWall.minuteOfDay)}</p>
            <h1 className="text-xl font-black">{profile.displayName}</h1>
          </div>
        </div>

        {next && nextWall ? (
          <button type="button" onClick={() => actions.open(next)} className="relative mt-5 block w-full text-start active:opacity-80">
            <p className="text-xs text-white/60">نوبت بعدی<Sep />{relativeDayLabel(nextWall.dateKey)}</p>
            <p className="mt-1 flex items-center gap-2 text-[30px] font-black leading-tight">
              {formatMinutesAsClock(nextWall.minuteOfDay)}
              <ChevronLeft className="h-5 w-5 text-white/50" aria-hidden />
            </p>
            <p className="truncate text-sm text-white/80">
              {next.customer.firstName} {next.customer.lastName} — {next.services.map((s) => s.service.name).join("، ")}
            </p>
          </button>
        ) : (
          <p className="relative mt-5 flex items-center gap-2 text-sm text-white/75">
            <Coffee className="h-4 w-4" aria-hidden />
            فعلاً نوبت پیش‌رویی ندارید.
          </p>
        )}

        <Link href="/stylist/earnings" className="relative mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-3 active:opacity-80">
          <span>
            <span className="block text-xs text-white/60">درآمد پیش‌بینی امروز (سهم شما)</span>
            <span className="block text-[22px] font-black leading-tight">{formatToman(todayShare)}</span>
          </span>
          <ChevronLeft className="mb-1 h-4 w-4 shrink-0 text-white/50" aria-hidden />
        </Link>
      </section>

      {profile.workingHours.length === 0 && (
        <Link
          href="/stylist/schedule"
          className="mt-3 flex items-center gap-3 rounded-3xl bg-app-pending/12 p-4 text-sm font-semibold text-app-pending active:opacity-80"
        >
          <Clock3 className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex-1">هنوز ساعات کاری‌تان را تنظیم نکرده‌اید؛ تا آن موقع مشتری‌ها نمی‌توانند با شما نوبت بگیرند.</span>
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      )}

      {error && <div className="mt-3"><ErrorBanner onRetry={reload}>{error}</ErrorBanner></div>}

      <ReviewsLinkCard token={token} scope="stylist" onlyWhenPending className="mt-3" />
      <LinkCard href="/stylist/share" icon={QrCode} title="کیت معرفی من" subtitle="لینک رزرو مستقیم با شما، کد QR و پوستر" className="mt-3" />

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <StatTile icon={CalendarCheck2} label="نوبت امروز" value={today.length} tone="accent" />
        <StatTile icon={Hourglass} label="منتظر تایید" value={pending.length} tone={pending.length ? "pending" : "ink"} />
        <StatTile icon={CalendarClock} label="نوبت‌های آینده" value={upcoming.length} />
      </div>

      <LinkCard href="/stylist/earnings" icon={Wallet} title="درآمد من" subtitle="سهم شما از نوبت‌ها، پرداخت‌های سالن و مانده حساب" className="mt-3" />
      <LinkCard href="/stylist/expenses" icon={Receipt} title="هزینه‌های من" subtitle="مواد مصرفی، ابزار و خریدهای کاری" className="mt-3" />

      {pending.length > 0 && (
        <>
          <SectionTitle
            action={
              pending.length > 3 && (
                <Link href="/stylist/appointments?filter=PENDING" className="text-[13px] font-bold text-app-accent">
                  همه
                </Link>
              )
            }
          >
            منتظر تایید شما
          </SectionTitle>
          <div className="flex flex-col gap-2.5">
            {pending.slice(0, 3).map((a, i) => (
              <AppointmentCard key={a.id} appointment={a} onOpen={actions.open} index={i} />
            ))}
          </div>
        </>
      )}

      <SectionTitle>برنامه امروز</SectionTitle>
      {today.length === 0 ? (
        <EmptyState icon={Coffee} title="امروز نوبتی ندارید" hint="نوبت‌های جدید اینجا و در تب نوبت‌ها نمایش داده می‌شوند." />
      ) : (
        <TodayTimeline appointments={today} onOpen={actions.open} />
      )}

      <AppointmentSheet
        appointment={actions.selected}
        onClose={actions.close}
        onSetStatus={actions.setStatus}
        onEdit={actions.edit}
        busyStatus={actions.busyStatus}
      />
      {actions.editing && token && (
        <SalonBookingSheet
          key={actions.editing.id}
          token={token}
          asStylist
          appointment={actions.editing}
          open
          onClose={actions.closeEdit}
          onCreated={reload}
        />
      )}
    </>
  );
}
