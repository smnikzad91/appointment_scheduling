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
  const text = `کد تایید نوبتت: ${code}\nآن را به کسی ندهید.`;
  const domain = otpDomain();
  return domain ? `${text}\n\n@${domain} #${code}` : text;
};

/** "۱٬۲۵۰٬۰۰۰" — toman amounts in SMS texts. */
export const faMoney = (n: number) => faDigits(Math.round(n).toLocaleString("en-US").replace(/,/g, "٬"));

/** «کیف پول نوبتت ۳۰۰٬۰۰۰ تومان شارژ شد\nموجودی: ۶۱۰٬۴۰۰ تومان» — one segment for any real amount. */
export const topUpPaidText = (p: { amount: string; balance: string }) => `کیف پول نوبتت ${p.amount} تومان شارژ شد\nموجودی: ${p.balance} تومان`;

/**
 * «برداشت ۵۰۰٬۰۰۰ تومان به حسابتان واریز شد\nپیگیری: 1402…» — the tracking line is left out when it
 * would push the text past one segment; «درخواست برداشت … تومان رد شد؛ مبلغ به کیف پول برگشت».
 */
export const withdrawalText = (kind: "withdrawal-paid" | "withdrawal-rejected", p: { amount: string; trackingCode: string }) => {
  if (kind === "withdrawal-rejected") return `درخواست برداشت ${p.amount} تومان رد شد؛ مبلغ به کیف پول برگشت`;
  const base = `برداشت ${p.amount} تومان به حسابتان واریز شد`;
  const withCode = `${base}\nپیگیری: ${p.trackingCode}`;
  return p.trackingCode && withCode.length <= SMS_SEGMENT ? withCode : base;
};

/** «باقی‌مانده نوبتت در سالن رز: ۱۹۰٬۰۰۰ تومان؛ در پنل از کیف پول پرداخت کنید» (the salon name is cut first). */
export const balanceRequestText = (p: { amount: string; salon: string }) =>
  fitSms(p, ["salon"], (q) => `باقی‌مانده نوبتت در ${q.salon}: ${q.amount} تومان؛ در پنل از کیف پول پرداخت کنید`);

/** One Unicode SMS segment; longer texts go out in parts (some phones show them as separate messages). */
export const SMS_SEGMENT = 70;

/**
 * Builds the text, shortening the longest of the named (free-text) fields with "…" until it fits
 * one segment. Fixed wording and times/dates are never cut.
 */
export function fitSms<T extends Record<string, string>>(p: T, trimmable: (keyof T)[], build: (p: T) => string, limit = SMS_SEGMENT): string {
  const q = { ...p };
  while (build(q).length > limit) {
    const key = trimmable.reduce((a, b) => (q[b].length > q[a].length ? b : a));
    const v = q[key].replace(/…$/, "");
    if (v.length <= 1) break;
    q[key] = (v.slice(0, -1).trimEnd() + "…") as T[keyof T];
  }
  return build(q);
}

/**
 * Services for a one-segment customer text: the first by name, the rest counted —
 * «کوتاهی مو»، «کوتاهی مو و ۲ خدمت دیگر». A list would get cut mid-word.
 */
export const servicesSummary = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? "") : `${names[0]} و ${faDigits(names.length - 1)} خدمت دیگر`;

/**
 * The customer's 1-hour reminder at a salon: services, salon, the stylist's first name —
 * «یادآوری نوبتت: ساعت ۰۹:۰۰ کوتاهی مو در سالن رز با مریم». Services are cut first, then the salon.
 */
export const customerReminderText = (p: { time: string; services: string; salon: string; stylist: string }) =>
  fitSms(p, ["services", "salon", "stylist"], (q) => `یادآوری نوبتت: ساعت ${q.time} ${q.services} در ${q.salon} با ${q.stylist}`);

/**
 * An independent stylist's reminder: the services instead of the business name, and the stylist's
 * first name — «یادآوری نوبتت: ساعت ۰۹:۰۰ ترمیم ناخن ژل با سارا». Services are cut first.
 */
export const independentReminderText = (p: { time: string; services: string; name: string }) =>
  fitSms(p, ["services", "name"], (q) => `یادآوری نوبتت: ساعت ${q.time} ${q.services} با ${q.name}`);

/** "سه‌شنبه ۷ مهر" — weekday and Jalali date of an instant, in the salon's time zone. */
export const jalaliDay = (instant: Date, timeZone: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(instant);

type BookingParams = { day: string; time: string; salon: string; stylist: string };

/** A prepaid booking cancelled by the salon or stylist — day and time identify it; no name, so the
 * refund line always fits one segment: «نوبتت سه‌شنبه ۱۴ مهر ۰۸:۰۰ لغو شد؛ پیش‌پرداخت به کیف پول برگشت». */
const prepaidCancelledText = (p: { day: string; time: string }) => `نوبتت ${p.day} ${p.time} لغو شد؛ پیش‌پرداخت به کیف پول برگشت`;
type CustomerBookingKind = "booked-customer" | "rescheduled-customer" | "cancelled-customer" | "confirmed-customer";

/**
 * An independent stylist is the business, so the text names only them (first name) — no
 * «در {salon} با {stylist}» naming the same person twice: «نوبتت: {day} ساعت {time} با سارا ثبت شد».
 */
export const independentBookingText = (kind: CustomerBookingKind, p: { day: string; time: string; name: string }, opts: { refunded?: boolean } = {}) => {
  // a cancelled prepaid booking: the pre-payment is back in the wallet (wallet/prepayment.ts)
  if (kind === "cancelled-customer" && opts.refunded) {
    return prepaidCancelledText(p);
  }
  const verb = { "booked-customer": "ثبت شد", "confirmed-customer": "تایید شد", "cancelled-customer": "لغو شد", "rescheduled-customer": "منتقل شد" }[kind];
  const lead = kind === "rescheduled-customer" ? "نوبتت: به " : "نوبتت: ";
  return fitSms(p, ["name"], (q) => `${lead}${q.day} ساعت ${q.time} با ${q.name} ${verb}`);
};

/** Texts for the customer when staff book, move or cancel their appointment. When both names
 * don't fit, the stylist is left out rather than cutting the salon's name short. */
export const customerBookingText = (kind: CustomerBookingKind, p: BookingParams, opts: { refunded?: boolean } = {}) => {
  const withStylist = (build: (q: BookingParams, by: string) => string) => {
    const text = fitSms(p, ["salon", "stylist"], (q) => build(q, ` با ${q.stylist}`));
    return text.includes(p.salon) ? text : fitSms(p, ["salon"], (q) => build(q, ""));
  };
  switch (kind) {
    case "booked-customer":
      return withStylist((q, by) => `نوبتت: ${q.day} ساعت ${q.time} در ${q.salon}${by} ثبت شد`);
    case "rescheduled-customer":
      return withStylist((q, by) => `نوبتت: به ${q.day} ساعت ${q.time} در ${q.salon}${by} منتقل شد`);
    case "confirmed-customer":
      return withStylist((q, by) => `نوبتت: ${q.day} ساعت ${q.time} در ${q.salon}${by} تایید شد`);
    case "cancelled-customer":
      return opts.refunded
        ? prepaidCancelledText(p)
        : fitSms(p, ["salon"], (q) => `نوبتت: ${q.day} ساعت ${q.time} در ${q.salon} لغو شد`);
  }
};

export const stylistReminderText = (p: { time: string; customer: string; services: string }) =>
  fitSms(p, ["customer", "services"], (q) => `یادآوری نوبتت: ساعت ${q.time} نوبت ${q.customer} (${q.services})`);

/**
 * To the stylist when a customer books online: the booking waits for their confirmation. A home
 * visit says «نوبت در منزل …» (the address itself is in the panel — it wouldn't fit one segment).
 */
export const stylistNewBookingText = (p: { day: string; time: string; customer: string; homeVisit?: boolean; prepaid?: boolean }) => {
  const { homeVisit, prepaid, ...rest } = p;
  // the customer already paid half from their wallet: say so, so the stylist checks it promptly
  if (prepaid) {
    return homeVisit
      ? fitSms(rest, ["customer"], (q) => `منزل ${q.customer} پیش‌پرداخت‌شده، ${q.day} ${q.time}؛ تایید کنید`)
      : fitSms(rest, ["customer"], (q) => `نوبت پیش‌پرداخت‌شده ${q.customer}، ${q.day} ${q.time}؛ تایید کنید`);
  }
  // A home visit has its own, shorter wording so it always fits one segment (the name is cut first).
  if (homeVisit) return fitSms(rest, ["customer"], (q) => `نوبت در منزل ${q.customer}، ${q.day} ${q.time}؛ در پنل تایید کنید`);
  return fitSms(rest, ["customer"], (q) => `نوبت جدید ${q.customer}، ${q.day} ${q.time}؛ در پنل نوبتت تایید کنید`);
};

/** Once, when an online booking is still unconfirmed a couple of hours later. */
export const stylistConfirmNudgeText = (p: { day: string; time: string; customer: string }) =>
  fitSms(p, ["customer"], (q) => `نوبت ${q.customer}، ${q.day} ${q.time} هنوز تایید نشده؛ در پنل نوبتت تایید کنید`);

/**
 * "Time to book again" to the customer: one segment (≤70 chars), no link — Iranian operators'
 * filters can block SMS that carry a domain — and no salon/stylist name. Long names are shortened with "…". The /r/<code> page
 * still exists (params.link, for a template API or a later link-friendly line); customers opt out
 * of these texts from their dashboard (User.promoSmsOptOut).
 */
export const SMS_TWO_SEGMENTS = 134;

// No salon or stylist name in the text (salon and independent stylist alike); `salon` stays in
// params for a template API.
export const rebookText = (p: { customer: string; days: string; service: string; salon: string; link?: string }) =>
  fitSms(
    { customer: p.customer, days: p.days, service: p.service },
    ["customer", "service"],
    (q) => `${q.customer} عزیز، ${q.days} روز از ${q.service} گذشت؛ وقت نوبت بعدی است`,
  );

// GSM 03.38 basic set (+ the escape-table chars, which cost two septets). Anything else — Persian
// included — makes the whole message UCS-2.
const GSM7 = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€";

/**
 * How many SMS parts a text is billed as: UCS-2 (any Persian) 70 chars in one part, else 67 per
 * part; GSM-7 160 septets in one, else 153 per part. The salon's monthly allowance is charged
 * this many (SubscriptionsService.takeReminderSms), matching what the gateway bills.
 */
export function smsParts(text: string): number {
  const chars = [...text];
  if (chars.length === 0) return 1;
  const gsm = chars.every((c) => GSM7.includes(c) || GSM7_EXT.includes(c));
  if (gsm) {
    const septets = chars.reduce((n, c) => n + (GSM7_EXT.includes(c) ? 2 : 1), 0);
    return septets <= 160 ? 1 : Math.ceil(septets / 153);
  }
  // UCS-2 counts UTF-16 code units (an emoji is two).
  return text.length <= SMS_SEGMENT ? 1 : Math.ceil(text.length / 67);
}
