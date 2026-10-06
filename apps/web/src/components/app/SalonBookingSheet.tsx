"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, Check, Save, UserCheck } from "lucide-react";
import {
  createSalonBooking,
  getMySalon,
  listMyServices,
  listMyStylists,
  lookupSalonCustomer,
  updateAppointmentDetails,
} from "@/lib/api/ownerSalon";
import { getMyStylistProfile } from "@/lib/api/stylistSelf";
import { salonApiFetch } from "@/lib/api/salonApiClient";
import { persianApiError } from "@/lib/api/errorMessages";
import { toastError } from "@/lib/toastError";
import { formatMinutesAsClock, formatToman, isValidIranianMobile, normalizeDigits, normalizeIranianMobile, toPersianDigits } from "@/lib/persian";
import { addDaysToDateKey, salonWallTimeToInstant, toSalonWallTime } from "@/lib/salonTime";
import { dateKeyToDate, toJalali } from "@/lib/jalali";
import Sep from "@/components/common/Sep";
import { PLACE_LABEL, type SalonKind, type ServiceLocation } from "@/lib/independent";
import Sheet from "./Sheet";
import TimePicker from "./TimePicker";
import type { AppAppointment } from "./appointments";
import { Avatar, Button, Field, TextArea, TextInput, cx } from "./ui";

/** How far ahead the day strip goes (the week view only offers tap-to-book inside it). */
export const DAYS_AHEAD = 30;
const STEP = 15;
const TIME_OPTIONS = Array.from({ length: (24 * 60) / STEP }, (_, i) => i * STEP).filter((m) => m >= 6 * 60);

interface Loaded {
  salon: { slug: string; timezone: string; status: string; kind?: SalonKind; serviceLocations?: ServiceLocation[] };
  stylists: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
    services: { serviceId: string; overridePriceToman: number | null; overrideDurationMinutes: number | null }[];
  }[];
  services: { id: string; name: string; priceToman: number; durationMinutes: number }[];
}

/** The owner books any active stylist; a stylist books only themselves. */
async function loadForOwner(token: string): Promise<Loaded> {
  const [salon, stylists, services] = await Promise.all([getMySalon(token), listMyStylists(token), listMyServices(token)]);
  return { salon, stylists: stylists.filter((s) => s.active), services: services.filter((s) => s.active) };
}

async function loadForStylist(token: string): Promise<Loaded> {
  const me = await getMyStylistProfile(token);
  return {
    salon: me.salon,
    stylists: me.active ? [me] : [],
    services: me.services.map((s) => s.service).filter((s) => s.active),
  };
}

function nextQuarterHour(minuteOfDay: number) {
  return Math.min(23 * 60 + 45, Math.ceil((minuteOfDay + 1) / STEP) * STEP);
}

/**
 * The salon books a customer (phone call or walk-in) with a specific stylist — from the owner's
 * panel for any stylist, or from a stylist's panel (`asStylist`) for themselves. Given an
 * `appointment`, it edits that booking instead (services, day/time, note; not customer or stylist). The customer is
 * found by phone — a returning customer's name is filled in — or created. Walk-ins can be
 * recorded for earlier today; the booking is confirmed straight away.
 */
export default function SalonBookingSheet({
  token,
  open,
  onClose,
  onCreated,
  asStylist = false,
  appointment,
  prefill,
}: {
  token: string;
  asStylist?: boolean;
  /** Edit this booking rather than create one. */
  appointment?: AppAppointment | null;
  /** New booking at a chosen slot (the week view's tap-to-book): day, start minute, maybe the stylist. */
  prefill?: { dateKey: string; minute: number; stylistId?: string } | null;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState<{ phone: string; name: { firstName: string; lastName: string } | null } | null>(null);
  const editing = appointment ?? null;
  // Editing: the customer's name on this booking (the API already shows any earlier override here).
  const [firstName, setFirstName] = useState(editing?.customer.firstName ?? "");
  const [lastName, setLastName] = useState(editing?.customer.lastName ?? "");
  const bookedStart = editing ? toSalonWallTime(new Date(editing.startAt)) : null;
  const [stylistId, setStylistId] = useState(editing?.stylistId ?? prefill?.stylistId ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>(() => editing?.services.map((s) => s.serviceId) ?? []);
  // Editing sends only what was changed, so a service the stylist no longer offers isn't dropped by accident.
  const [servicesTouched, setServicesTouched] = useState(false);
  const todayKey = toSalonWallTime(new Date()).dateKey;
  const [dateKey, setDateKey] = useState(bookedStart?.dateKey ?? prefill?.dateKey ?? todayKey);
  const [minute, setMinute] = useState(() => bookedStart?.minuteOfDay ?? prefill?.minute ?? nextQuarterHour(toSalonWallTime(new Date()).minuteOfDay));
  const [slots, setSlots] = useState<{ key: string; free: number[] } | null>(null);
  const dayStripRef = useRef<HTMLDivElement>(null);
  const [notes, setNotes] = useState(editing?.notes ?? "");
  // Independent stylists: where it happens ("" = not specified) and a home visit's address.
  const [place, setPlace] = useState<ServiceLocation | "">(editing?.serviceLocation ?? "");
  const [visitAddress, setVisitAddress] = useState(editing?.visitAddress ?? "");
  const [busy, setBusy] = useState(false);

  // The page remounts this sheet (new `key`) each time it opens, so the form starts empty; load
  // the salon's current stylists and services once it's shown.
  useEffect(() => {
    if (!open) return;
    (asStylist ? loadForStylist : loadForOwner)(token)
      .then((loaded) => {
        setData(loaded);
        setStylistId((id) => (loaded.stylists.some((s) => s.id === id) ? id : (loaded.stylists[0]?.id ?? "")));
      })
      .catch(() => toastError("دریافت اطلاعات سالن انجام نشد"));
  }, [open, token, asStylist]);

  // An edited booking or a week-view tap can start on a day further along the strip: show it.
  useEffect(() => {
    if (!data) return;
    dayStripRef.current?.querySelector<HTMLElement>(`[data-day="${dateKey}"]`)?.scrollIntoView({ inline: "center", block: "nearest" });
    // only once the strip has rendered; later day taps are already on screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Returning customer? Fill in the name. «+989…» is accepted and stored / texted as «09…».
  const normalizedPhone = normalizeIranianMobile(phone);
  const known = lookup?.phone === normalizedPhone ? lookup.name : null;
  useEffect(() => {
    if (!isValidIranianMobile(normalizedPhone)) return;
    let cancelled = false;
    lookupSalonCustomer(token, normalizedPhone)
      .then((r) => {
        if (!cancelled) setLookup({ phone: normalizedPhone, name: r.found ? { firstName: r.firstName ?? "", lastName: r.lastName ?? "" } : null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [normalizedPhone, token]);

  const stylist = data?.stylists.find((s) => s.id === stylistId) ?? null;
  const offered = useMemo(() => {
    if (!data || !stylist) return [];
    return stylist.services.flatMap((entry) => {
      const service = data.services.find((s) => s.id === entry.serviceId);
      if (!service) return [];
      return [
        {
          ...service,
          priceToman: entry.overridePriceToman ?? service.priceToman,
          durationMinutes: entry.overrideDurationMinutes ?? service.durationMinutes,
        },
      ];
    });
  }, [data, stylist]);

  // Only services the picked stylist offers count (switching stylist drops the rest).
  const chosen = offered.filter((s) => serviceIds.includes(s.id));
  const chosenIds = chosen.map((s) => s.id);
  const chosenKey = chosenIds.join(",");
  const totalPrice = chosen.reduce((sum, s) => sum + s.priceToman, 0);
  const totalMinutes = chosen.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Free slots as quick picks (online availability; only for a live salon).
  const slotsKey = `${stylistId}|${chosenKey}|${dateKey}`;
  const freeSlots = slots?.key === slotsKey ? slots.free : null;
  useEffect(() => {
    if (!data || data.salon.status !== "ACTIVE" || !stylistId || !chosenKey) return;
    let cancelled = false;
    const params = new URLSearchParams({ date: dateKey, serviceIds: chosenKey, stylistId });
    salonApiFetch<{ startMinute: number; available: boolean }[]>(`/salons/${encodeURIComponent(data.salon.slug)}/availability?${params}`)
      .then((list) => {
        if (!cancelled) setSlots({ key: `${stylistId}|${chosenKey}|${dateKey}`, free: list.filter((s) => s.available).map((s) => s.startMinute) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data, stylistId, chosenKey, dateKey]);

  const days = useMemo(
    () =>
      Array.from({ length: DAYS_AHEAD }, (_, i) => {
        const key = addDaysToDateKey(todayKey, i);
        const j = toJalali(dateKeyToDate(key));
        return { key, top: i === 0 ? "امروز" : i === 1 ? "فردا" : j.weekDay.name, bottom: `${toPersianDigits(j.day)} ${j.month.name}` };
      }),
    [todayKey],
  );

  // Offered only to an independent stylist working in more than one place (a single one is implied).
  const places = data?.salon.kind === "INDEPENDENT" && (data.salon.serviceLocations?.length ?? 0) > 1 ? data.salon.serviceLocations! : [];

  /** Only a changed place / address is sent when editing. */
  function placeFields(before: ServiceLocation | null, beforeAddress: string | null) {
    const next = place || null;
    const address = next === "CLIENT_HOME" ? visitAddress.trim() : null;
    if (next === before && (address ?? null) === (beforeAddress ?? null)) return {};
    return { serviceLocation: next, visitAddress: address };
  }

  async function saveEdit(a: AppAppointment) {
    if (!data) return;
    if (servicesTouched && chosenIds.length === 0) return toastError("دست‌کم یک خدمت انتخاب کنید");
    if (!firstName.trim()) return toastError("نام مشتری را وارد کنید");
    if (place === "CLIENT_HOME" && visitAddress.trim().length < 5) return toastError("نشانی مشتری را برای خدمات در منزل وارد کنید");
    const startAt = salonWallTimeToInstant(dateKey, minute, data.salon.timezone).toISOString();
    setBusy(true);
    try {
      await updateAppointmentDetails(token, a.id, {
        ...(servicesTouched && { serviceIds: chosenIds }),
        ...(new Date(startAt).getTime() !== new Date(a.startAt).getTime() && { startAt }),
        notes: notes.trim() || null,
        ...placeFields(editing?.serviceLocation ?? null, editing?.visitAddress ?? null),
        // Only a changed name is saved on the booking, so an untouched one keeps following the account.
        ...(firstName.trim() !== a.customer.firstName && { customerFirstName: firstName.trim() }),
        ...(lastName.trim() !== a.customer.lastName && { customerLastName: lastName.trim() || null }),
      });
      onCreated();
      onClose();
    } catch (err) {
      toastError(persianApiError(err, "ذخیره تغییرات نوبت انجام نشد"));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!data) return;
    if (editing) return saveEdit(editing);
    if (!isValidIranianMobile(normalizedPhone)) return toastError("شماره موبایل مشتری را به شکل ۰۹۱۲۱۲۳۴۵۶۷ یا ‎+989121234567‎ وارد کنید");
    if (!known && !firstName.trim()) return toastError("نام مشتری را وارد کنید");
    if (!stylistId) return toastError(asStylist ? "حساب آرایشگری شما غیرفعال است" : "آرایشگر را انتخاب کنید");
    if (chosenIds.length === 0) return toastError("دست‌کم یک خدمت انتخاب کنید");
    if (place === "CLIENT_HOME" && visitAddress.trim().length < 5) return toastError("نشانی مشتری را برای خدمات در منزل وارد کنید");
    setBusy(true);
    try {
      await createSalonBooking(token, {
        customerPhone: normalizedPhone,
        customerFirstName: known ? undefined : firstName.trim(),
        customerLastName: known ? undefined : lastName.trim(),
        stylistId,
        serviceIds: chosenIds,
        startAt: salonWallTimeToInstant(dateKey, minute, data.salon.timezone).toISOString(),
        notes: notes.trim() || undefined,
        ...(place && { serviceLocation: place }),
        ...(place === "CLIENT_HOME" && { visitAddress: visitAddress.trim() }),
      });
      onCreated();
      onClose();
    } catch (err) {
      toastError(persianApiError(err, "ثبت نوبت انجام نشد"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => !busy && onClose()}
      title={editing ? "ویرایش نوبت" : "ثبت نوبت برای مشتری"}
      footer={
        editing ? (
          <Button block icon={Save} busy={busy} disabled={!data} onClick={submit}>
            ذخیره تغییرات
          </Button>
        ) : (
          <Button block icon={CalendarPlus} busy={busy} disabled={!data} onClick={submit}>
            {chosen.length > 0 ? `ثبت نوبت — ${formatToman(totalPrice)}` : "ثبت نوبت"}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {editing ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="نام مشتری">
                <TextInput value={firstName} maxLength={50} onChange={(e) => setFirstName(e.target.value)} />
              </Field>
              <Field label="نام خانوادگی">
                <TextInput value={lastName} maxLength={50} onChange={(e) => setLastName(e.target.value)} />
              </Field>
            </div>
            {editing.stylist && !asStylist && (
              <p className="-mt-2 flex items-center gap-2 text-sm font-medium text-app-muted">
                <UserCheck className="h-4 w-4" aria-hidden />
                {editing.stylist.displayName}
              </p>
            )}
          </>
        ) : (
          <>
            <Field label="موبایل مشتری" hint="به شکل ۰۹… یا ‎+98…‎">
              <TextInput
                type="tel"
                inputMode="tel"
                dir="ltr"
                maxLength={17}
                className="text-end"
                value={phone}
                onChange={(e) => setPhone(normalizeDigits(e.target.value))}
                placeholder="09121234567 / +989121234567"
              />
            </Field>
            {known ? (
              <p className="-mt-2 flex items-center gap-2 rounded-2xl bg-app-done/10 px-4 py-3 text-sm font-bold text-app-done">
                <UserCheck className="h-4 w-4" aria-hidden />
                مشتری قبلی: {known.firstName} {known.lastName}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="نام">
                  <TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </Field>
                <Field label="نام خانوادگی">
                  <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </Field>
              </div>
            )}
          </>
        )}

        {!asStylist && !editing && (
          <div>
            <p className="mb-1.5 px-1 text-[13px] font-bold text-app-muted">آرایشگر</p>
            {/* Tap-to-choose cards instead of a native <select>; a salon has a handful of stylists. */}
            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="radiogroup" aria-label="آرایشگر">
              {data?.stylists.map((s) => {
                const on = s.id === stylistId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setStylistId(s.id)}
                    className={cx(
                      "relative flex w-[92px] shrink-0 snap-start flex-col items-center gap-1.5 rounded-2xl border px-2 pb-2.5 pt-3 transition active:scale-95",
                      on ? "border-app-accent bg-app-accent-soft" : "border-app-line bg-app-card",
                    )}
                  >
                    <Avatar name={s.displayName} src={s.avatarUrl} size={48} className={on ? "ring-2 ring-app-accent ring-offset-2 ring-offset-app-bg" : ""} />
                    <span className={cx("w-full truncate text-center text-[13px] font-bold", on ? "text-app-ink" : "text-app-muted")}>{s.displayName}</span>
                    {on && (
                      <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-app-accent text-app-accent-ink">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <p className="mb-1.5 px-1 text-[13px] font-bold text-app-muted">خدمات</p>
          {stylist && offered.length === 0 ? (
            <p className="rounded-2xl bg-app-card-2 p-4 text-sm text-app-muted">
              {asStylist ? "هنوز خدمتی برای شما تعریف نشده است؛ مدیر سالن باید خدمات شما را مشخص کند." : "برای این آرایشگر هنوز خدمتی تعریف نشده است."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {offered.map((s) => {
                const on = chosenIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setServicesTouched(true);
                      setServiceIds((ids) => (on ? ids.filter((x) => x !== s.id) : [...ids, s.id]));
                    }}
                    className={cx(
                      "rounded-2xl border px-3.5 py-2 text-start transition active:scale-95",
                      on ? "border-app-accent bg-app-accent-soft text-app-ink" : "border-app-line bg-app-card text-app-ink",
                    )}
                  >
                    <span className="block text-sm font-bold">{s.name}</span>
                    <span className="block text-xs text-app-muted">
                      {formatToman(s.priceToman)}
                      <Sep />
                      {toPersianDigits(s.durationMinutes)} دقیقه
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <p className="mb-1.5 px-1 text-[13px] font-bold text-app-muted">روز</p>
          <div ref={dayStripRef} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
                data-day={d.key}
                onClick={() => setDateKey(d.key)}
                className={cx(
                  "flex h-16 w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl text-center transition active:scale-95",
                  d.key === dateKey ? "bg-app-ink text-app-bg" : "border border-app-line bg-app-card text-app-ink",
                )}
              >
                <span className="text-xs font-bold">{d.top}</span>
                <span className={cx("text-[11px]", d.key === dateKey ? "opacity-80" : "text-app-muted")}>{d.bottom}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-1 text-[13px] font-bold text-app-muted">ساعت شروع</p>
          {freeSlots && freeSlots.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {freeSlots.slice(0, 16).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinute(m)}
                  className={cx(
                    "h-9 rounded-full px-3 text-sm font-bold transition active:scale-95",
                    m === minute ? "bg-app-accent text-app-accent-ink" : "bg-app-card-2 text-app-ink",
                  )}
                >
                  {formatMinutesAsClock(m)}
                </button>
              ))}
            </div>
          )}
          <TimePicker
            value={minute}
            onChange={setMinute}
            options={TIME_OPTIONS}
            free={freeSlots}
            hint="ساعت‌های سبز خالی‌اند؛ برای مشتری حضوری هر ساعتی را می‌توانید انتخاب کنید."
          />
          <p className="mt-1.5 px-1 text-xs leading-6 text-app-muted">
            {freeSlots && freeSlots.length > 0
              ? "زمان‌های بالا خالی‌اند؛ برای مشتری حضوری هر ساعتی را هم می‌توانید انتخاب کنید."
              : "برای مشتری حضوری می‌توانید ساعتی از امروز را که گذشته هم ثبت کنید."}
            {totalMinutes > 0 && ` مدت: ${toPersianDigits(totalMinutes)} دقیقه، تا ${formatMinutesAsClock(minute + totalMinutes)}.`}
          </p>
        </div>

        {places.length > 0 && (
          <Field label="محل انجام نوبت">
            <div className="flex flex-wrap gap-2">
              {places.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setPlace(place === loc ? "" : loc)}
                  aria-pressed={place === loc}
                  className={cx(
                    "h-10 rounded-full px-4 text-sm font-semibold transition active:scale-95",
                    place === loc ? "bg-app-accent text-app-accent-ink" : "border border-app-line bg-app-card text-app-muted",
                  )}
                >
                  {PLACE_LABEL[loc]}
                </button>
              ))}
            </div>
          </Field>
        )}
        {place === "CLIENT_HOME" && (
          <Field label="نشانی مشتری">
            <TextArea rows={2} maxLength={300} value={visitAddress} onChange={(e) => setVisitAddress(e.target.value)} placeholder="شهر، خیابان، کوچه، پلاک، طبقه" />
          </Field>
        )}

        <Field label="یادداشت (اختیاری)">
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثلاً رنگ مورد نظر مشتری" />
        </Field>

      </div>
    </Sheet>
  );
}
