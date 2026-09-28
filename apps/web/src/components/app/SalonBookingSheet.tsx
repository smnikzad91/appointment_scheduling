"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, UserCheck } from "lucide-react";
import {
  createSalonBooking,
  getMySalon,
  listMyServices,
  listMyStylists,
  lookupSalonCustomer,
  type OwnerSalon,
  type OwnerService,
  type OwnerStylist,
} from "@/lib/api/ownerSalon";
import { createMyBooking, getMyStylistProfile } from "@/lib/api/stylistSelf";
import { salonApiFetch } from "@/lib/api/salonApiClient";
import { persianApiError } from "@/lib/api/errorMessages";
import { formatMinutesAsClock, formatToman, isValidIranianMobile, normalizeDigits, toPersianDigits } from "@/lib/persian";
import { addDaysToDateKey, salonWallTimeToInstant, toSalonWallTime } from "@/lib/salonTime";
import { dateKeyToDate, toJalali } from "@/lib/jalali";
import Sep from "@/components/common/Sep";
import Sheet from "./Sheet";
import { Button, Field, Select, TextArea, TextInput, cx } from "./ui";

const DAYS_AHEAD = 30;
const STEP = 15;
const TIME_OPTIONS = Array.from({ length: (24 * 60) / STEP }, (_, i) => i * STEP).filter((m) => m >= 6 * 60);

interface Loaded {
  salon: Pick<OwnerSalon, "slug" | "status" | "timezone">;
  stylists: (Pick<OwnerStylist, "id" | "displayName"> & {
    services: { serviceId: string; overridePriceToman: number | null; overrideDurationMinutes: number | null }[];
  })[];
  services: Pick<OwnerService, "id" | "name" | "priceToman" | "durationMinutes">[];
}

async function loadForOwner(token: string): Promise<Loaded> {
  const [salon, stylists, services] = await Promise.all([getMySalon(token), listMyStylists(token), listMyServices(token)]);
  return { salon, stylists: stylists.filter((s) => s.active), services: services.filter((s) => s.active) };
}

/** A stylist books only with themselves, from the services they offer. */
async function loadForStylist(token: string): Promise<Loaded> {
  const me = await getMyStylistProfile(token);
  if (!me.salon) throw new Error("salon missing from /stylists/me");
  return { salon: me.salon, stylists: [me], services: me.services.map((s) => s.service).filter((s) => s.active) };
}

function nextQuarterHour(minuteOfDay: number) {
  return Math.min(23 * 60 + 45, Math.ceil((minuteOfDay + 1) / STEP) * STEP);
}

/**
 * The salon books a customer (phone call or walk-in) with a specific stylist — or, with
 * `asStylist`, a stylist books one with themselves. The customer is found by phone — a returning
 * customer's name is filled in — or created. Walk-ins can be recorded for earlier today; the
 * booking is confirmed straight away, and the api texts the customer about it.
 */
export default function SalonBookingSheet({
  token,
  open,
  onClose,
  onCreated,
  asStylist = false,
}: {
  token: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  asStylist?: boolean;
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState<{ phone: string; name: { firstName: string; lastName: string } | null } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const todayKey = toSalonWallTime(new Date()).dateKey;
  const [dateKey, setDateKey] = useState(todayKey);
  const [minute, setMinute] = useState(() => nextQuarterHour(toSalonWallTime(new Date()).minuteOfDay));
  const [slots, setSlots] = useState<{ key: string; free: number[] } | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The page remounts this sheet (new `key`) each time it opens, so the form starts empty; load
  // the salon's current stylists and services once it's shown.
  useEffect(() => {
    if (!open) return;
    (asStylist ? loadForStylist(token) : loadForOwner(token))
      .then((loaded) => {
        setData(loaded);
        setStylistId((id) => (loaded.stylists.some((s) => s.id === id) ? id : (loaded.stylists[0]?.id ?? "")));
      })
      .catch(() => setError("دریافت اطلاعات سالن انجام نشد"));
  }, [open, token, asStylist]);

  // Returning customer? Fill in the name.
  const normalizedPhone = normalizeDigits(phone);
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
    salonApiFetch<{ startMinute: number; available: boolean }[]>(`/salons/${data.salon.slug}/availability?${params}`)
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

  async function submit() {
    if (!data) return;
    if (!isValidIranianMobile(normalizedPhone)) return setError("شماره موبایل مشتری باید با ۰۹ شروع شده و ۱۱ رقم باشد");
    if (!known && !firstName.trim()) return setError("نام مشتری را وارد کنید");
    if (!stylistId) return setError("آرایشگر را انتخاب کنید");
    if (chosenIds.length === 0) return setError("دست‌کم یک خدمت انتخاب کنید");
    setBusy(true);
    setError(null);
    try {
      const input = {
        customerPhone: normalizedPhone,
        customerFirstName: known ? undefined : firstName.trim(),
        customerLastName: known ? undefined : lastName.trim(),
        serviceIds: chosenIds,
        startAt: salonWallTimeToInstant(dateKey, minute, data.salon.timezone).toISOString(),
        notes: notes.trim() || undefined,
      };
      await (asStylist ? createMyBooking(token, input) : createSalonBooking(token, { ...input, stylistId }));
      onCreated();
      onClose();
    } catch (err) {
      setError(persianApiError(err, "ثبت نوبت انجام نشد"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => !busy && onClose()}
      title="ثبت نوبت برای مشتری"
      footer={
        <Button block icon={CalendarPlus} busy={busy} disabled={!data} onClick={submit}>
          {chosen.length > 0 ? `ثبت نوبت — ${formatToman(totalPrice)}` : "ثبت نوبت"}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="موبایل مشتری">
          <TextInput
            type="tel"
            inputMode="numeric"
            dir="ltr"
            maxLength={11}
            className="text-end"
            value={phone}
            onChange={(e) => setPhone(normalizeDigits(e.target.value))}
            placeholder="09121234567"
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

        {!asStylist && (
          <Field label="آرایشگر">
            <Select value={stylistId} onChange={(e) => setStylistId(e.target.value)}>
              {data?.stylists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div>
          <p className="mb-1.5 px-1 text-[13px] font-bold text-app-muted">خدمات</p>
          {stylist && offered.length === 0 ? (
            <p className="rounded-2xl bg-app-card-2 p-4 text-sm text-app-muted">{asStylist ? "هنوز خدمتی برای شما تعریف نشده است." : "برای این آرایشگر هنوز خدمتی تعریف نشده است."}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {offered.map((s) => {
                const on = chosenIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setServiceIds((ids) => (on ? ids.filter((x) => x !== s.id) : [...ids, s.id]))}
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
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
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
          <Select aria-label="ساعت شروع" value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="text-center font-bold">
            {(TIME_OPTIONS.includes(minute) ? TIME_OPTIONS : [...TIME_OPTIONS, minute].sort((a, b) => a - b)).map((m) => (
              <option key={m} value={m}>
                {formatMinutesAsClock(m)}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 px-1 text-xs leading-6 text-app-muted">
            {freeSlots && freeSlots.length > 0
              ? "زمان‌های بالا خالی‌اند؛ برای مشتری حضوری هر ساعتی را هم می‌توانید انتخاب کنید."
              : "برای مشتری حضوری می‌توانید ساعتی از امروز را که گذشته هم ثبت کنید."}
            {totalMinutes > 0 && ` مدت: ${toPersianDigits(totalMinutes)} دقیقه، تا ${formatMinutesAsClock(minute + totalMinutes)}.`}
          </p>
        </div>

        <Field label="یادداشت (اختیاری)">
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثلاً رنگ مورد نظر مشتری" />
        </Field>

        {error && <p className="rounded-2xl bg-app-danger/10 px-4 py-3 text-sm font-medium text-app-danger">{error}</p>}
      </div>
    </Sheet>
  );
}
