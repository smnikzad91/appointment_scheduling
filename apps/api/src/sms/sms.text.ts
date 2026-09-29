// Persian texts and value formatting for the SMS messages (used by free-text providers; template
// providers get the same values as params).

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export const faDigits = (s: string | number) => String(s).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

/** "۱۶:۳۰" from minutes after midnight. */
export const clock = (minuteOfDay: number) =>
  faDigits(`${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}:${String(minuteOfDay % 60).padStart(2, "0")}`);

/**
 * The OTP message. With SMS_OTP_DOMAIN set (the site's host, e.g. "dev-iot.ir") it ends with the
 * WebOTP line "@host #code", so Chrome on Android reads the code and fills it in by itself. The
 * host must match the site the user is on, or Chrome ignores the message.
 */
export const otpDomain = () => process.env.SMS_OTP_DOMAIN?.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "";

/** Kept within one Unicode segment (70 chars) even with the WebOTP line: longer texts go out in
 * parts, which some phones show as two separate messages. */
export const otpText = (code: string) => {
  const text = `کد ورود نوبتا: ${code}\nآن را به کسی ندهید.`;
  const domain = otpDomain();
  return domain ? `${text}\n\n@${domain} #${code}` : text;
};

/** One Unicode SMS segment; longer texts go out in parts (some phones show them as separate messages). */
export const SMS_SEGMENT = 70;

/**
 * Builds the text, shortening the longest of the named (free-text) fields with "…" until it fits
 * one segment. Fixed wording and times/dates are never cut.
 */
export function fitSms<T extends Record<string, string>>(p: T, trimmable: (keyof T)[], build: (p: T) => string): string {
  const q = { ...p };
  while (build(q).length > SMS_SEGMENT) {
    const key = trimmable.reduce((a, b) => (q[b].length > q[a].length ? b : a));
    const v = q[key].replace(/…$/, "");
    if (v.length <= 1) break;
    q[key] = (v.slice(0, -1).trimEnd() + "…") as T[keyof T];
  }
  return build(q);
}

export const customerReminderText = (p: { time: string; salon: string; stylist: string }) =>
  fitSms(p, ["salon", "stylist"], (q) => `یادآوری نوبتا: ساعت ${q.time} در ${q.salon} با ${q.stylist}`);

/** "سه‌شنبه ۷ مهر" — weekday and Jalali date of an instant, in the salon's time zone. */
export const jalaliDay = (instant: Date, timeZone: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(instant);

type BookingParams = { day: string; time: string; salon: string; stylist: string };

/** Texts for the customer when staff book, move or cancel their appointment. When both names
 * don't fit, the stylist is left out rather than cutting the salon's name short. */
export const customerBookingText = (kind: "booked-customer" | "rescheduled-customer" | "cancelled-customer" | "confirmed-customer", p: BookingParams) => {
  const withStylist = (build: (q: BookingParams, by: string) => string) => {
    const text = fitSms(p, ["salon", "stylist"], (q) => build(q, ` با ${q.stylist}`));
    return text.includes(p.salon) ? text : fitSms(p, ["salon"], (q) => build(q, ""));
  };
  switch (kind) {
    case "booked-customer":
      return withStylist((q, by) => `نوبتا: نوبت ${q.day} ساعت ${q.time} در ${q.salon}${by} ثبت شد`);
    case "rescheduled-customer":
      return withStylist((q, by) => `نوبتا: نوبت شما به ${q.day} ساعت ${q.time} در ${q.salon}${by} منتقل شد`);
    case "confirmed-customer":
      return withStylist((q, by) => `نوبتا: نوبت ${q.day} ساعت ${q.time} در ${q.salon}${by} تایید شد`);
    case "cancelled-customer":
      return fitSms(p, ["salon"], (q) => `نوبتا: نوبت ${q.day} ساعت ${q.time} در ${q.salon} لغو شد`);
  }
};

export const stylistReminderText = (p: { time: string; customer: string; services: string }) =>
  fitSms(p, ["customer", "services"], (q) => `یادآوری نوبتا: ساعت ${q.time} نوبت ${q.customer} (${q.services})`);

/** To the stylist when a customer books online: the booking waits for their confirmation. */
export const stylistNewBookingText = (p: { day: string; time: string; customer: string }) =>
  fitSms(p, ["customer"], (q) => `نوبت جدید ${q.customer}، ${q.day} ${q.time}؛ در پنل نوبتا تایید کنید`);
