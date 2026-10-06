"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarRange, CalendarX2, List } from "lucide-react";
import { salonWallTimeToInstant, toSalonWallTime } from "@/lib/salonTime";
import { AppointmentList, AppointmentSheet, useAppointmentActions, type AppAppointment, type AppointmentStatus, type BalanceMethod } from "./appointments";
import SalonBookingSheet from "./SalonBookingSheet";
import AppointmentCalendar from "./AppointmentCalendar";
import AppointmentWeek from "./AppointmentWeek";
import { ChipTabs, EmptyState, ErrorBanner, ListSkeleton, PageHeader, cx } from "./ui";

type Tab = "upcoming" | "pending" | "history" | "cancelled";
type View = "list" | "week" | "calendar";
const VIEW_KEY = "appointmentsView";

const EMPTY: Record<Tab, string> = {
  upcoming: "نوبت پیش‌رویی ندارید",
  pending: "نوبتی منتظر تایید نیست",
  history: "هنوز نوبتی انجام نشده",
  cancelled: "نوبت لغوشده‌ای وجود ندارد",
};

/**
 * The appointments tab for both panels: upcoming / awaiting confirmation / history / cancelled,
 * grouped by day, with actions in a bottom sheet. `?filter=PENDING` opens the confirmation tab.
 */
export default function AppointmentsScreen({
  title,
  showStylist,
  load,
  updateStatus,
  headerAction,
  edit,
}: {
  title: string;
  /** Lets staff edit open appointments (the stylist only their own). */
  edit?: { token: string; asStylist?: boolean };
  showStylist?: boolean;
  /** e.g. the salon's "new booking" button */
  headerAction?: React.ReactNode;
  load: () => Promise<AppAppointment[]>;
  updateStatus: (id: string, status: AppointmentStatus, balanceMethod?: BalanceMethod) => Promise<unknown>;
}) {
  const [appointments, setAppointments] = useState<AppAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [view, setView] = useState<View>("list");
  // tap-to-book from the week view (remounted per slot so the form starts fresh)
  const [newAt, setNewAt] = useState<{ dateKey: string; minute: number; stylistId?: string; n: number } | null>(null);

  const reload = useCallback(() => {
    load()
      .then((list) => {
        setError(null);
        setAppointments(list);
      })
      .catch(() => setError("خطا در دریافت نوبت‌ها"));
  }, [load]);

  useEffect(reload, [reload]);

  useEffect(() => {
    // Read once after mount (not during render) so SSR and hydration agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get("filter") === "PENDING") setTab("pending");
    // The list/calendar choice is remembered on this device (a deep link to pending opens the list).
    else {
      try {
        const saved = localStorage.getItem(VIEW_KEY);
        if (saved === "calendar" || saved === "week") setView(saved);
      } catch {}
    }
  }, []);

  const chooseView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };

  const actions = useAppointmentActions(updateStatus, reload);

  const buckets = useMemo(() => {
    const all = appointments ?? [];
    const startOfToday = salonWallTimeToInstant(toSalonWallTime(new Date()).dateKey, 0).toISOString();
    const open = (a: AppAppointment) => a.status === "PENDING" || a.status === "CONFIRMED";
    return {
      upcoming: all.filter((a) => open(a) && a.startAt >= startOfToday),
      pending: all.filter((a) => a.status === "PENDING"),
      history: all.filter((a) => a.status !== "CANCELLED" && (!open(a) || a.startAt < startOfToday)),
      cancelled: all.filter((a) => a.status === "CANCELLED"),
    };
  }, [appointments]);

  const list = buckets[tab];

  return (
    <>
      <PageHeader title={title} action={headerAction} />

      <div className="mb-3 flex rounded-full border border-app-line bg-app-card p-0.5" role="tablist" aria-label="نمایش نوبت‌ها">
        {(
          [
            ["list", List, "فهرست"],
            ["week", CalendarRange, "هفته"],
            ["calendar", CalendarDays, "ماه"],
          ] as const
        ).map(([v, Icon, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => chooseView(v)}
            className={cx(
              "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[13px] font-bold transition",
              view === v ? "bg-app-ink text-app-bg" : "text-app-muted",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {view === "list" && (
      <ChipTabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "upcoming", label: "پیش‌رو", count: buckets.upcoming.length },
          { value: "pending", label: "منتظر تایید", count: buckets.pending.length },
          { value: "history", label: "گذشته" },
          { value: "cancelled", label: "لغو شده" },
        ]}
      />
      )}

      {error && <ErrorBanner onRetry={reload}>{error}</ErrorBanner>}

      {!appointments ? (
        !error && <ListSkeleton />
      ) : view === "week" ? (
        <AppointmentWeek
          appointments={appointments}
          showStylist={showStylist}
          onOpen={actions.open}
          onCreateAt={edit ? (slot) => setNewAt({ ...slot, n: Date.now() }) : undefined}
        />
      ) : view === "calendar" ? (
        <AppointmentCalendar appointments={appointments} showStylist={showStylist} onOpen={actions.open} />
      ) : list.length === 0 ? (
        <EmptyState icon={CalendarX2} title={EMPTY[tab]} />
      ) : (
        <AppointmentList
          appointments={list}
          showStylist={showStylist}
          onOpen={actions.open}
          order={tab === "upcoming" || tab === "pending" ? "asc" : "desc"}
        />
      )}

      <AppointmentSheet
        appointment={actions.selected}
        showStylist={showStylist}
        onClose={actions.close}
        onSetStatus={actions.setStatus}
        onEdit={edit ? actions.edit : undefined}
        busyStatus={actions.busyStatus}
      />
      {edit && newAt && (
        <SalonBookingSheet
          key={newAt.n}
          token={edit.token}
          asStylist={edit.asStylist}
          prefill={newAt}
          open
          onClose={() => setNewAt(null)}
          onCreated={reload}
        />
      )}
      {edit && actions.editing && (
        <SalonBookingSheet
          key={actions.editing.id}
          token={edit.token}
          asStylist={edit.asStylist}
          appointment={actions.editing}
          open
          onClose={actions.closeEdit}
          onCreated={reload}
        />
      )}
    </>
  );
}
