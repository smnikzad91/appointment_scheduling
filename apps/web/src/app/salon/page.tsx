"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReviewsLinkCard from "@/components/app/ReviewsLinkCard";
import { Calculator, CalendarCheck2, CalendarClock, ExternalLink, Hourglass, Share2, Sparkles } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { getMySalon, listMySalonAppointments, listMyStylists, updateAppointmentStatus, type OwnerSalon, type OwnerAppointment, type OwnerStylist } from "@/lib/api/ownerSalon";
import ZeroCommissionNotice from "@/components/app/ZeroCommissionNotice";
import { isIndependent } from "@/lib/independent";
import { SubscriptionNotice, useMySubscription } from "@/components/app/Subscription";
import { formatToman } from "@/lib/persian";
import { toSalonWallTime } from "@/lib/salonTime";
import SalonBookingSheet from "@/components/app/SalonBookingSheet";
import { AppointmentCard, AppointmentSheet, TodayTimeline, useAppointmentActions } from "@/components/app/appointments";
import { Avatar, EmptyState, ErrorBanner, ListSkeleton, SectionTitle, StatTile, cx, LinkCard } from "@/components/app/ui";

const STATUS_PILL: Record<OwnerSalon["status"], { label: string; className: string }> = {
  ACTIVE: { label: "فعال", className: "bg-app-done/15 text-app-done" },
  PENDING: { label: "در انتظار تایید", className: "bg-app-pending/15 text-app-pending" },
  SUSPENDED: { label: "معلق", className: "bg-app-danger/15 text-app-danger" },
};

export default function SalonOverviewPage() {
  const token = useApiAccessToken();
  const subscription = useMySubscription(token);
  const [salon, setSalon] = useState<OwnerSalon | null>(null);
  const [appointments, setAppointments] = useState<OwnerAppointment[] | null>(null);
  const [stylists, setStylists] = useState<OwnerStylist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(() => {
    if (!token) return;
    Promise.all([getMySalon(token), listMySalonAppointments(token)])
      .then(([s, a]) => {
        setError(null);
        setSalon(s);
        setAppointments(a);
      })
      .catch(() => setError("خطا در دریافت اطلاعات سالن"));
    // Only for the 0% notice — the page works without it.
    listMyStylists(token)
      .then(setStylists)
      .catch(() => {});
  }, [token]);

  useEffect(reload, [reload]);

  const actions = useAppointmentActions(
    useCallback((id, status) => updateAppointmentStatus(token!, id, status), [token]),
    reload,
  );

  if (error && !salon) return <ErrorBanner onRetry={reload}>{error}</ErrorBanner>;
  if (!salon || !appointments) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-44 animate-pulse rounded-[32px] bg-app-card-2" />
        <ListSkeleton rows={3} />
      </div>
    );
  }

  const independent = isIndependent(salon);
  const now = new Date();
  const todayKey = toSalonWallTime(now).dateKey;
  const live = appointments.filter((a) => a.status !== "CANCELLED");
  const today = live.filter((a) => toSalonWallTime(a.startAt).dateKey === todayKey);
  const upcoming = live.filter((a) => new Date(a.startAt) >= now);
  const needsConfirmation = upcoming.filter((a) => a.status === "PENDING").sort((a, b) => a.startAt.localeCompare(b.startAt));
  const todayRevenue = today.filter((a) => a.status !== "NO_SHOW").reduce((sum, a) => sum + a.priceToman, 0);

  const bookingUrl = typeof window !== "undefined" ? `${window.location.origin}/s/${salon.slug}` : `/s/${salon.slug}`;
  async function shareBookingLink() {
    try {
      if (navigator.share) {
        await navigator.share({ title: salon!.name, text: `رزرو آنلاین نوبت در ${salon!.name}`, url: bookingUrl });
      } else {
        await navigator.clipboard.writeText(bookingUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[32px] bg-[#2a1d26] p-5 text-[#f8f1e9] shadow-app dark:bg-[#33232f] dark:ring-1 dark:ring-app-line">
        {/* Arch motif — a salon mirror, echoing the landing page. */}
        <span className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-36 rounded-t-full border-[10px] border-app-accent/35" aria-hidden />
        <span className="pointer-events-none absolute -bottom-20 left-16 h-40 w-28 rounded-t-full bg-app-accent/25" aria-hidden />

        <div className="relative flex items-center gap-3">
          <Avatar name={salon.name} src={salon.logoUrl} size={52} className="bg-white/15 text-white ring-2 ring-white/20" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black">{salon.name}</h1>
            <span className={cx("mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold", STATUS_PILL[salon.status].className)}>
              {STATUS_PILL[salon.status].label}
            </span>
          </div>
        </div>

        <p className="relative mt-5 text-xs text-white/60">درآمد پیش‌بینی امروز</p>
        <p className="relative text-[26px] font-black leading-tight">{formatToman(todayRevenue)}</p>

        {salon.status === "ACTIVE" && (
          <div className="relative mt-5 flex gap-2">
            <button
              type="button"
              onClick={shareBookingLink}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-app-accent text-sm font-bold text-app-accent-ink active:scale-[0.98]"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              {copied ? "لینک کپی شد" : "اشتراک لینک رزرو"}
            </button>
            <Link
              href={`/s/${salon.slug}`}
              target="_blank"
              className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 text-sm font-bold active:scale-[0.98]"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              {independent ? "صفحه رزرو" : "صفحه سالن"}
            </Link>
          </div>
        )}
      </section>

      {salon.status === "PENDING" && (
        <p className="mt-3 rounded-3xl bg-app-pending/12 p-4 text-sm leading-7 text-app-pending">
          {independent
            ? "حساب شما در انتظار تایید پشتیبانی است. تا آن موقع صفحه رزرو برای مشتری‌ها نمایش داده نمی‌شود؛ اما می‌توانید خدمات، ساعات کاری و تنظیمات را آماده کنید."
            : "سالن شما در انتظار تایید پشتیبانی است. تا آن موقع صفحه رزرو برای مشتری‌ها نمایش داده نمی‌شود؛ اما می‌توانید خدمات، آرایشگرها و تنظیمات را آماده کنید."}
        </p>
      )}
      {salon.status === "SUSPENDED" && (
        <p className="mt-3 rounded-3xl bg-app-danger/12 p-4 text-sm leading-7 text-app-danger">
          {independent ? "صفحه شما" : "سالن شما"} به‌طور موقت معلق شده و برای مشتری‌ها قابل مشاهده نیست. برای اطلاعات بیشتر با پشتیبانی
          تماس بگیرید.
        </p>
      )}

      {error && <div className="mt-3"><ErrorBanner onRetry={reload}>{error}</ErrorBanner></div>}

      <ReviewsLinkCard token={token} scope="salon" onlyWhenPending className="mt-3" />

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <StatTile icon={CalendarCheck2} label="نوبت امروز" value={today.length} tone="accent" />
        <StatTile icon={Hourglass} label="منتظر تایید" value={needsConfirmation.length} tone={needsConfirmation.length ? "pending" : "ink"} />
        <StatTile icon={CalendarClock} label="نوبت‌های آینده" value={upcoming.length} />
      </div>

      <LinkCard
        href="/salon/accounting"
        icon={Calculator}
        title="حسابداری"
        subtitle={independent ? "درآمد، هزینه‌ها و سود خالص ماه" : "درآمد، سهم آرایشگرها، پرداخت‌ها و هزینه‌ها"}
        className="mt-3"
      />
      {/* An independent stylist's own 0% is by design: all the money is theirs. */}
      {!independent && <ZeroCommissionNotice stylists={stylists} className="mt-3" />}
      <SubscriptionNotice sub={subscription} className="mt-3" />

      {needsConfirmation.length > 0 && (
        <>
          <SectionTitle
            action={
              needsConfirmation.length > 3 && (
                <Link href="/salon/appointments?filter=PENDING" className="text-[13px] font-bold text-app-accent">
                  همه
                </Link>
              )
            }
          >
            منتظر تایید شما
          </SectionTitle>
          <div className="flex flex-col gap-2.5">
            {needsConfirmation.slice(0, 3).map((a, i) => (
              <AppointmentCard key={a.id} appointment={a} showStylist={!independent} onOpen={actions.open} index={i} />
            ))}
          </div>
        </>
      )}

      <SectionTitle>برنامه امروز</SectionTitle>
      {today.length === 0 ? (
        <EmptyState icon={Sparkles} title="امروز نوبتی ثبت نشده" hint={`لینک رزرو ${independent ? "خودتان" : "سالن"} را برای مشتری‌ها بفرستید تا خودشان آنلاین نوبت بگیرند.`} />
      ) : (
        <TodayTimeline appointments={today} showStylist={!independent} onOpen={actions.open} />
      )}

      <AppointmentSheet
        appointment={actions.selected}
        showStylist={!independent}
        onClose={actions.close}
        onSetStatus={actions.setStatus}
        onEdit={actions.edit}
        busyStatus={actions.busyStatus}
        error={actions.error}
      />
      {actions.editing && token && (
        <SalonBookingSheet
          key={actions.editing.id}
          token={token}
          appointment={actions.editing}
          open
          onClose={actions.closeEdit}
          onCreated={reload}
        />
      )}
    </>
  );
}
