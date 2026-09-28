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

export const otpText = (code: string) => {
  const text = `کد تایید نوبتا: ${code}\nاین کد را در اختیار دیگران قرار ندهید.`;
  const domain = otpDomain();
  return domain ? `${text}\n\n@${domain} #${code}` : text;
};

export const customerReminderText = (p: { time: string; salon: string; stylist: string }) =>
  `یادآوری نوبتا: نوبت شما ساعت ${p.time} در ${p.salon} با ${p.stylist} است.`;

/** "سه‌شنبه ۷ مهر" — weekday and Jalali date of an instant, in the salon's time zone. */
export const jalaliDay = (instant: Date, timeZone: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(instant);

type BookingParams = { day: string; time: string; salon: string; stylist: string };

/** Texts for the customer when staff book, move or cancel their appointment. */
export const customerBookingText = (kind: "booked-customer" | "rescheduled-customer" | "cancelled-customer", p: BookingParams) => {
  switch (kind) {
    case "booked-customer":
      return `نوبتا: نوبت شما در ${p.salon} برای ${p.day} ساعت ${p.time} با ${p.stylist} ثبت شد.`;
    case "rescheduled-customer":
      return `نوبتا: نوبت شما در ${p.salon} به ${p.day} ساعت ${p.time} با ${p.stylist} تغییر کرد.`;
    case "cancelled-customer":
      return `نوبتا: نوبت شما در ${p.salon} برای ${p.day} ساعت ${p.time} لغو شد.`;
  }
};

export const stylistReminderText = (p: { time: string; customer: string; services: string }) =>
  `یادآوری نوبتا: ساعت ${p.time} نوبت ${p.customer} (${p.services}) را دارید.`;
