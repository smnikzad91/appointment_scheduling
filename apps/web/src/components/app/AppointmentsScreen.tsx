"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarX2 } from "lucide-react";
import { salonWallTimeToInstant, toSalonWallTime } from "@/lib/salonTime";
import { AppointmentList, AppointmentSheet, useAppointmentActions, type AppAppointment, type AppointmentStatus } from "./appointments";
import { ChipTabs, EmptyState, ErrorBanner, ListSkeleton, PageHeader } from "./ui";

type Tab = "upcoming" | "pending" | "history" | "cancelled";

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
}: {
  title: string;
  showStylist?: boolean;
  /** e.g. the salon's "new booking" button */
  headerAction?: React.ReactNode;
  load: () => Promise<AppAppointment[]>;
  updateStatus: (id: string, status: AppointmentStatus) => Promise<unknown>;
}) {
  const [appointments, setAppointments] = useState<AppAppointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");

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
  }, []);

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

      {error && <ErrorBanner onRetry={reload}>{error}</ErrorBanner>}

      {!appointments ? (
        !error && <ListSkeleton />
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
        busyStatus={actions.busyStatus}
        error={actions.error}
      />
    </>
  );
}
