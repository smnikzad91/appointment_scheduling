"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CheckCheck, Pencil, Phone, UserX, X, type LucideIcon } from "lucide-react";
import type { StylistAppointment } from "@/lib/api/stylistSelf";
import { formatMinutesAsClock, formatToman, toPersianDigits } from "@/lib/persian";
import { addDaysToDateKey, formatSalonDate, toSalonWallTime } from "@/lib/salonTime";
import Sheet from "./Sheet";
import { Button, Card, cx, riseStyle } from "./ui";
import Sep from "@/components/common/Sep";

// Shared by the salon-owner and stylist panels. Owner rows also carry the stylist's name.
export type AppAppointment = StylistAppointment & { stylist?: { displayName: string } };
export type AppointmentStatus = AppAppointment["status"];

export const STATUS_META: Record<AppointmentStatus, { label: string; className: string }> = {
  PENDING: { label: "در انتظار تایید", className: "bg-app-pending/12 text-app-pending" },
  CONFIRMED: { label: "تایید شده", className: "bg-app-confirmed/12 text-app-confirmed" },
  COMPLETED: { label: "انجام شده", className: "bg-app-done/12 text-app-done" },
  CANCELLED: { label: "لغو شده", className: "bg-app-muted/12 text-app-muted" },
  NO_SHOW: { label: "عدم حضور", className: "bg-app-danger/12 text-app-danger" },
};

export function StatusChip({ status }: { status: AppointmentStatus }) {
  const meta = STATUS_META[status];
  return <span className={cx("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none", meta.className)}>{meta.label}</span>;
}

function wall(a: AppAppointment) {
  const start = toSalonWallTime(a.startAt);
  const end = toSalonWallTime(a.endAt);
  return { start, end, duration: Math.round((new Date(a.endAt).getTime() - new Date(a.startAt).getTime()) / 60_000) };
}

/** "امروز" / "فردا" / "دیروز", otherwise the full Jalali date. */
export function relativeDayLabel(dateKey: string): string {
  const today = toSalonWallTime(new Date()).dateKey;
  if (dateKey === today) return "امروز";
  if (dateKey === addDaysToDateKey(today, 1)) return "فردا";
  if (dateKey === addDaysToDateKey(today, -1)) return "دیروز";
  return formatSalonDate(`${dateKey}T12:00:00Z`);
}

/** Groups appointments by salon-local day; `order` decides whether days run forward or backward. */
export function groupByDay(appointments: AppAppointment[], order: "asc" | "desc" = "asc") {
  const sorted = [...appointments].sort((a, b) =>
    order === "asc" ? a.startAt.localeCompare(b.startAt) : b.startAt.localeCompare(a.startAt),
  );
  const groups: { dateKey: string; items: AppAppointment[] }[] = [];
  for (const a of sorted) {
    const key = toSalonWallTime(a.startAt).dateKey;
    const last = groups[groups.length - 1];
    if (last?.dateKey === key) last.items.push(a);
    else groups.push({ dateKey: key, items: [a] });
  }
  return groups;
}

export function AppointmentCard({
  appointment: a,
  showStylist,
  onOpen,
  index = 0,
}: {
  appointment: AppAppointment;
  showStylist?: boolean;
  onOpen: (a: AppAppointment) => void;
  index?: number;
}) {
  const { start, duration } = wall(a);
  const muted = a.status === "CANCELLED" || a.status === "NO_SHOW";
  return (
    <button
      type="button"
      onClick={() => onOpen(a)}
      style={riseStyle(index)}
      className={cx(
        "app-rise flex w-full items-stretch gap-3.5 rounded-3xl border border-app-line bg-app-card p-3.5 text-start shadow-app transition active:scale-[0.985]",
        muted && "opacity-60",
      )}
    >
      <span className="flex w-[64px] shrink-0 flex-col items-center justify-center rounded-2xl bg-app-card-2 py-2">
        <span className="text-[19px] font-black leading-none text-app-ink">{formatMinutesAsClock(start.minuteOfDay)}</span>
        <span className="mt-1.5 text-[11px] font-medium text-app-muted">{toPersianDigits(duration)} دقیقه</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <span className="flex items-center justify-between gap-2">
          <span className={cx("truncate text-[15px] font-bold text-app-ink", a.status === "CANCELLED" && "line-through")}>
            {a.customer.firstName} {a.customer.lastName}
          </span>
          <StatusChip status={a.status} />
        </span>
        <span className="truncate text-[13px] text-app-muted">{a.services.map((s) => s.service.name).join("، ")}</span>
        <span className="flex items-center gap-1.5 text-[12px] text-app-muted">
          {showStylist && a.stylist && (
            <>
              <span className="font-semibold text-app-ink/80">{a.stylist.displayName}</span>
              <Sep className="mx-0" />
            </>
          )}
          <span>{formatToman(a.priceToman)}</span>
        </span>
      </span>
    </button>
  );
}

/** Day-grouped list with sticky day headers. */
export function AppointmentList({
  appointments,
  showStylist,
  onOpen,
  order = "asc",
  hideDayHeaders,
}: {
  appointments: AppAppointment[];
  showStylist?: boolean;
  onOpen: (a: AppAppointment) => void;
  order?: "asc" | "desc";
  /** For a single day whose heading is already shown (the calendar view). */
  hideDayHeaders?: boolean;
}) {
  let index = 0;
  return (
    <div className="flex flex-col gap-5">
      {groupByDay(appointments, order).map((group) => (
        <section key={group.dateKey}>
          {!hideDayHeaders && (
            <h3 className="sticky top-[calc(56px+env(safe-area-inset-top))] z-10 -mx-4 mb-2 bg-app-bg/90 px-5 py-1.5 text-[13px] font-black text-app-ink backdrop-blur">
              {relativeDayLabel(group.dateKey)}
              <span className="ms-2 font-medium text-app-muted">{toPersianDigits(group.items.length)} نوبت</span>
            </h3>
          )}
          <div className="flex flex-col gap-2.5">
            {group.items.map((a) => (
              <AppointmentCard key={a.id} appointment={a} showStylist={showStylist} onOpen={onOpen} index={index++} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const NEXT_ACTIONS: Record<AppointmentStatus, { status: AppointmentStatus; label: string; icon: LucideIcon; variant: "primary" | "secondary" | "danger" }[]> = {
  PENDING: [
    { status: "CONFIRMED", label: "تایید نوبت", icon: Check, variant: "primary" },
    { status: "COMPLETED", label: "انجام شد", icon: CheckCheck, variant: "secondary" },
    { status: "NO_SHOW", label: "مشتری نیامد", icon: UserX, variant: "secondary" },
    { status: "CANCELLED", label: "لغو نوبت", icon: X, variant: "danger" },
  ],
  CONFIRMED: [
    { status: "COMPLETED", label: "انجام شد", icon: CheckCheck, variant: "primary" },
    { status: "NO_SHOW", label: "مشتری نیامد", icon: UserX, variant: "secondary" },
    { status: "CANCELLED", label: "لغو نوبت", icon: X, variant: "danger" },
  ],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

/** Detail + actions for one appointment, as a bottom sheet. */
export function AppointmentSheet({
  appointment: a,
  showStylist,
  onClose,
  onSetStatus,
  onEdit,
  busyStatus,
  error,
}: {
  appointment: AppAppointment | null;
  showStylist?: boolean;
  onClose: () => void;
  /** Opens the edit form; offered while the appointment is still open. */
  onEdit?: (a: AppAppointment) => void;
  onSetStatus: (a: AppAppointment, status: AppointmentStatus) => void;
  busyStatus: AppointmentStatus | null;
  error?: string | null;
}) {
  if (!a) return null;
  const { start, end, duration } = wall(a);
  const actions = NEXT_ACTIONS[a.status];

  return (
    <Sheet open onClose={onClose} title="جزئیات نوبت">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[22px] font-black leading-tight text-app-ink">
            {a.customer.firstName} {a.customer.lastName}
          </p>
          <p className="mt-1 text-sm text-app-muted">
            {relativeDayLabel(start.dateKey)}<Sep />{formatMinutesAsClock(start.minuteOfDay)} تا {formatMinutesAsClock(end.minuteOfDay)}
          </p>
        </div>
        <StatusChip status={a.status} />
      </div>

      <Card className="mb-4 divide-y divide-app-line p-0 shadow-none">
        <Row label="خدمات" value={a.services.map((s) => s.service.name).join("، ")} />
        {showStylist && a.stylist && <Row label="آرایشگر" value={a.stylist.displayName} />}
        <Row label="مدت" value={`${toPersianDigits(duration)} دقیقه`} />
        <Row label="مبلغ" value={formatToman(a.priceToman)} />
        {a.notes && <Row label="یادداشت" value={a.notes} />}
      </Card>

      {a.customer.phone && (
        <a
          href={`tel:${a.customer.phone}`}
          className="mb-4 flex h-12 items-center justify-center gap-2 rounded-2xl border border-app-line bg-app-card text-[15px] font-bold text-app-ink active:bg-app-card-2"
        >
          <Phone className="h-[18px] w-[18px] text-app-accent" aria-hidden />
          تماس با مشتری
          <span dir="ltr" className="font-medium text-app-muted">
            {toPersianDigits(a.customer.phone)}
          </span>
        </a>
      )}

      {onEdit && actions.length > 0 && (
        <Button variant="secondary" block icon={Pencil} disabled={busyStatus !== null} onClick={() => onEdit(a)} className="mb-2.5">
          ویرایش نوبت
        </Button>
      )}

      {error && <p className="mb-3 rounded-2xl bg-app-danger/10 px-4 py-3 text-sm font-medium text-app-danger">{error}</p>}

      {actions.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          {actions.map((action, i) => (
            <Button
              key={action.status}
              variant={action.variant}
              icon={action.icon}
              busy={busyStatus === action.status}
              disabled={busyStatus !== null}
              onClick={() => onSetStatus(a, action.status)}
              className={i === 0 ? "col-span-2" : undefined}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-app-muted">این نوبت بسته شده و تغییری روی آن ممکن نیست.</p>
      )}
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
      <span className="shrink-0 text-app-muted">{label}</span>
      <span className="text-end font-semibold text-app-ink">{value}</span>
    </div>
  );
}

/**
 * Today's schedule as a vertical timeline, with a "now" marker slotted in between the
 * appointments that have started and the ones still ahead.
 */
export function TodayTimeline({ appointments, showStylist, onOpen }: { appointments: AppAppointment[]; showStylist?: boolean; onOpen: (a: AppAppointment) => void }) {
  const now = useNow();
  const sorted = [...appointments].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const nowIndex = sorted.findIndex((a) => new Date(a.startAt).getTime() > now);
  const nowMinute = toSalonWallTime(new Date(now)).minuteOfDay;

  const rows: React.ReactNode[] = [];
  sorted.forEach((a, i) => {
    if (i === nowIndex) rows.push(<NowMarker key="now" minute={nowMinute} />);
    const { start, end } = wall(a);
    const past = new Date(a.endAt).getTime() < now;
    rows.push(
      <li key={a.id} className="relative ps-7" style={riseStyle(i)}>
        <span
          className={cx(
            "absolute start-[5px] top-5 h-3 w-3 rounded-full ring-4 ring-app-card",
            past ? "bg-app-line" : a.status === "PENDING" ? "bg-app-pending" : "bg-app-accent",
          )}
          aria-hidden
        />
        <button type="button" onClick={() => onOpen(a)} className={cx("app-rise w-full py-2.5 text-start active:opacity-70", past && "opacity-55")}>
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-[17px] font-black text-app-ink">
              {formatMinutesAsClock(start.minuteOfDay)}
              <span className="ms-1.5 text-xs font-medium text-app-muted">تا {formatMinutesAsClock(end.minuteOfDay)}</span>
            </span>
            {a.status === "PENDING" && <StatusChip status="PENDING" />}
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-app-ink/85">
            {a.customer.firstName} {a.customer.lastName}
            <span className="font-normal text-app-muted">
              {" "}
              — {a.services.map((s) => s.service.name).join("، ")}
              {showStylist && a.stylist && (
                <>
                  <Sep />
                  {a.stylist.displayName}
                </>
              )}
            </span>
          </span>
        </button>
      </li>,
    );
  });
  if (nowIndex === -1 && sorted.length > 0) rows.push(<NowMarker key="now" minute={nowMinute} />);

  return (
    <Card className="p-4">
      <ol className="relative before:absolute before:bottom-3 before:start-[10px] before:top-3 before:w-px before:bg-app-line">{rows}</ol>
    </Card>
  );
}

/** Current time in ms, refreshed every minute so the timeline's "now" marker moves on its own. */
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function NowMarker({ minute }: { minute: number }) {
  return (
    <li className="relative flex items-center gap-2 py-1 ps-7" aria-label="اکنون">
      <span className="absolute start-[3px] h-4 w-4 rounded-full bg-app-accent/20" aria-hidden>
        <span className="absolute inset-1 rounded-full bg-app-accent" />
      </span>
      <span className="h-px flex-1 bg-app-accent/50" aria-hidden />
      <span className="text-[11px] font-black text-app-accent">اکنون {formatMinutesAsClock(minute)}</span>
    </li>
  );
}

/** Selection, status-change and edit state for AppointmentSheet, shared by the salon and stylist pages. */
export function useAppointmentActions(
  updateStatus: (id: string, status: AppointmentStatus) => Promise<unknown>,
  onChanged: () => void,
) {
  const [selected, setSelected] = useState<AppAppointment | null>(null);
  // The appointment open in the edit form (SalonBookingSheet), which replaces the detail sheet.
  const [editing, setEditing] = useState<AppAppointment | null>(null);
  const [busyStatus, setBusyStatus] = useState<AppointmentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback((a: AppAppointment) => {
    setError(null);
    setSelected(a);
  }, []);
  const close = useCallback(() => setSelected(null), []);
  const edit = useCallback((a: AppAppointment) => {
    setSelected(null);
    setEditing(a);
  }, []);
  const closeEdit = useCallback(() => setEditing(null), []);

  const setStatus = useCallback(
    async (a: AppAppointment, status: AppointmentStatus) => {
      setBusyStatus(status);
      setError(null);
      try {
        await updateStatus(a.id, status);
        setSelected(null);
        onChanged();
      } catch {
        setError("تغییر وضعیت نوبت انجام نشد، دوباره تلاش کنید");
      } finally {
        setBusyStatus(null);
      }
    },
    [updateStatus, onChanged],
  );

  return { selected, open, close, setStatus, busyStatus, error, editing, edit, closeEdit };
}
