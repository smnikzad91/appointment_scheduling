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

/** «کیف پول نوبتت منفی ۱۰٬۰۰۰ تومان شد؛ برای ادامه پیامک نوبت‌ها شارژ کنید» — exactly one segment. */
export const lowBalanceText = (p: { limit: string }) => `کیف پول نوبتت منفی ${p.limit} تومان شد؛ برای ادامه پیامک نوبت‌ها شارژ کنید`;

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

/**
 * After approval, the free trial: «نوبتت: یک ماه رایگان پلن «سالن استارتر» برای سالنتان فعال شد (تا
 * ۲۸ آبان). بعد از آن برای ادامه رزرو آنلاین، پلن را از کیف پول بخرید.» — two segments at most
 * (a long plan name is cut). `length` is «یک ماه» for 30 days, else «۱۴ روز».
 */
export const trialStartedText = (p: { plan: string; until: string; length: string }, independent: boolean) =>
  fitSms(
    { plan: p.plan },
    ["plan"],
    (q) => `نوبتت: ${p.length} رایگان پلن «${q.plan}» برای ${independent ? "شما" : "سالنتان"} فعال شد (تا ${p.until}). بعد از آن برای ادامه رزرو آنلاین، پلن را از کیف پول بخرید.`,
    SMS_TWO_SEGMENTS,
  );

/**
 * To the owner a few days before their free trial ends (TrialReminderService), at most two segments
 * (the plan name is cut first): «نوبتت: ماه رایگان سالنتان ۳ روز دیگر (۲۸ آبان) تمام و رزرو
 * آنلاین بسته می‌شود. برای ادامه، پلن «سالن استارتر» را از کیف پول بخرید.»
 */
export const trialEndingText = (p: { plan: string; until: string; left: string }, independent: boolean) =>
  fitSms(
    { plan: p.plan },
    ["plan"],
    (q) => `نوبتت: ماه رایگان ${independent ? "شما" : "سالنتان"} ${p.left} (${p.until}) تمام و رزرو آنلاین بسته می‌شود. برای ادامه، پلن «${q.plan}» را از کیف پول بخرید.`,
    SMS_TWO_SEGMENTS,
  );

/** «یک ماه» / «۱۴ روز»: how long a trial from `from` to `until` is, in salon-local calendar days. */
export function trialLength(from: Date, until: Date, timeZone = "Asia/Tehran"): string {
  // calendar days in the salon's timezone: a trial ends at 23:59:59 of its last day
  const day = (d: Date) => Date.parse(new Intl.DateTimeFormat("en-CA", { timeZone }).format(d));
  const days = Math.round((day(until) - day(from)) / 86_400_000);
  return days === 30 ? "یک ماه" : `${faDigits(days)} روز`;
}

/** «۲۸ آبان» — a Jalali day and month in the salon's timezone. */
export const jalaliDayMonth = (at: Date, timeZone: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone, day: "numeric", month: "long" }).format(at);

/**
 * To the owner when the platform admin changes their salon's status, one segment (the name is cut
 * first; an independent stylist's page is «صفحه رزرو شما»): approved «سالن «رز» در نوبتت تایید شد؛
 * صفحه رزرو فعال است», rejected «ثبت‌نام «رز» در نوبتت تایید نشد؛ با پشتیبانی تماس بگیرید»,
 * suspended «صفحه «رز» در نوبتت معلق شد؛ با پشتیبانی تماس بگیرید», reactivated «صفحه «رز» در
 * نوبتت دوباره فعال شد».
 */
export const salonStatusText = (change: "approved" | "rejected" | "suspended" | "reactivated", p: { name: string; independent: boolean }) =>
  fitSms({ name: p.name }, ["name"], (q) => {
    switch (change) {
      case "approved":
        return p.independent ? `صفحه رزرو شما «${q.name}» در نوبتت تایید و فعال شد` : `سالن «${q.name}» در نوبتت تایید شد؛ صفحه رزرو فعال است`;
      case "rejected":
        return `ثبت‌نام «${q.name}» در نوبتت تایید نشد؛ با پشتیبانی تماس بگیرید`;
      case "suspended":
        return `صفحه «${q.name}» در نوبتت معلق شد؛ با پشتیبانی تماس بگیرید`;
      case "reactivated":
        return `صفحه «${q.name}» در نوبتت دوباره فعال شد`;
    }
  });

/** Which message a status change sends its owner; null = none (no change, or back to «waiting»). */
export function salonStatusChange(from: string, to: string): "approved" | "rejected" | "suspended" | "reactivated" | null {
  if (from === to) return null;
  if (to === "ACTIVE") return from === "PENDING" ? "approved" : "reactivated";
  if (to === "SUSPENDED") return from === "PENDING" ? "rejected" : "suspended";
  return null;
}

/**
 * For the platform admin when someone signs up, one segment (the names are cut first):
 * «سالن تازه ثبت‌نام کرد: رز، قائم‌شهر؛ منتظر تایید» / «آرایشگر مستقل تازه: سارا، تهران؛ منتظر تایید» /
 * «آرایشگر تازه در سالن رز: مریم احمدی».
 */
export const adminNewAccountText = (p: { who: "salon" | "independent" | "stylist"; name: string; place: string }) =>
  fitSms({ name: p.name, place: p.place }, ["name", "place"], (q) =>
    p.who === "stylist"
      ? `آرایشگر تازه در ${q.place}: ${q.name}`
      : `${p.who === "salon" ? "سالن تازه ثبت‌نام کرد" : "آرایشگر مستقل تازه"}: ${q.name}، ${q.place}؛ منتظر تایید`,
  );

/** To the platform admin: «درخواست برداشت ۵۰۰٬۰۰۰ تومان از مریم احمدی؛ در پنل مدیریت بررسی کنید» (the name is cut first). */
export const adminWithdrawalText = (p: { amount: string; name: string }) =>
  fitSms(p, ["name"], (q) => `درخواست برداشت ${q.amount} تومان از ${q.name}؛ در پنل مدیریت بررسی کنید`);

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
 * The customer's 1-hour reminder at a salon: salon and the stylist's first name, no services (owner's
 * choice, 2026-10-05) — «یادآوری نوبتت: ساعت ۰۹:۰۰ در سالن رز با مریم». The salon name is cut first.
 */
export const customerReminderText = (p: { time: string; salon: string; stylist: string }) =>
  fitSms(p, ["salon", "stylist"], (q) => `یادآوری نوبتت: ساعت ${q.time} در ${q.salon} با ${q.stylist}`);

/** An independent stylist's reminder: just them — «یادآوری نوبتت: ساعت ۰۹:۰۰ با سارا». */
export const independentReminderText = (p: { time: string; name: string }) =>
  fitSms(p, ["name"], (q) => `یادآوری نوبتت: ساعت ${q.time} با ${q.name}`);

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

type NamedBooking = { day: string; time: string; customer: string };

/**
 * One segment that still says who the booking is for: when the full text doesn't fit, the weekday goes
 * first («چهارشنبه ۶ آبان» → «۶ آبان»; date + time still identify the booking), then the last name,
 * and only then is the name cut with «…» — not «نوبت خ…، چهارشنبه ۶ آبان …».
 */
export function fitNamedBooking<T extends NamedBooking>(p: T, build: (q: T) => string): string {
  const day = p.day.replace(/^\S+\s+/, ""); // the weekday is the first word
  const first = p.customer.trim().split(/\s+/)[0] ?? p.customer;
  for (const q of [p, { ...p, day }, { ...p, day, customer: first }]) {
    const text = build(q);
    if (text.length <= SMS_SEGMENT) return text;
  }
  return fitSms({ ...p, day, customer: first }, ["customer"], build);
}

/** The stylist's 1-hour reminder: who, no services — «یادآوری نوبتت: ساعت ۰۹:۰۰ نوبت نگار رضایی». */
export const stylistReminderText = (p: { time: string; customer: string }) =>
  fitSms(p, ["customer"], (q) => `یادآوری نوبتت: ساعت ${q.time} نوبت ${q.customer}`);

/**
 * To the stylist when a customer books online: the booking waits for their confirmation. A home
 * visit says «نوبت در منزل …» (the address itself is in the panel — it wouldn't fit one segment).
 */
export const stylistNewBookingText = (p: { day: string; time: string; customer: string; homeVisit?: boolean; prepaid?: boolean }) => {
  const { homeVisit, prepaid, ...rest } = p;
  // the customer already pre-paid part of it from their wallet: say so, so the stylist checks it promptly
  if (prepaid) {
    return homeVisit
      ? fitNamedBooking(rest, (q) => `منزل ${q.customer} پیش‌پرداخت‌شده، ${q.day} ${q.time}؛ تایید کنید`)
      : fitNamedBooking(rest, (q) => `نوبت پیش‌پرداخت‌شده ${q.customer}، ${q.day} ${q.time}؛ تایید کنید`);
  }
  // A home visit has its own, shorter wording so it always fits one segment (the name is cut first).
  if (homeVisit) return fitNamedBooking(rest, (q) => `نوبت در منزل ${q.customer}، ${q.day} ${q.time}؛ در پنل تایید کنید`);
  return fitNamedBooking(rest, (q) => `نوبت جدید ${q.customer}، ${q.day} ${q.time}؛ در پنل نوبتت تایید کنید`);
};

/** Once, 24 h after a booking ended while it's still open: «نوبت نگار رضایی، سه‌شنبه ۱۴ مهر ۰۸:۰۰ باز مانده؛ وضعیتش را در پنل مشخص کنید». */
export const stylistStateNudgeText = (p: NamedBooking) =>
  fitNamedBooking(p, (q) => `نوبت ${q.customer}، ${q.day} ${q.time} باز مانده؛ وضعیتش را در پنل مشخص کنید`);

/** Once, when an online booking is still unconfirmed a couple of hours later. */
export const stylistConfirmNudgeText = (p: NamedBooking) =>
  fitNamedBooking(p, (q) => `نوبت ${q.customer}، ${q.day} ${q.time} هنوز تایید نشده؛ در پنل تایید کنید`);

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

/**
 * A prepaid booking confirmed or cancelled by the salon/stylist: what happened to the pre-payment and
 * the customer's wallet balance now (owner's request, 2026-10-30). Up to two segments — it can't fit
 * one with the date, the amount and the balance — and the salon's (or independent stylist's) name is
 * cut first:
 * «نوبتت چهارشنبه ۱۴ آبان ساعت ۰۸:۰۰ در سالن رز تایید شد.\nپیش‌پرداخت ۲۵۰٬۰۰۰ تومان از کیف پول کسر شد؛ موجودی: ۱٬۲۵۰٬۰۰۰ تومان»
 * «… لغو شد.\nپیش‌پرداخت ۲۵۰٬۰۰۰ تومان به کیف پول برگشت؛ موجودی: …»; `forfeited` — the customer cancelled
 * after it was confirmed — «… لغو شد.\nپیش‌پرداخت … تومان برنمی‌گردد؛ موجودی: …» (they were warned before cancelling).
 * `place` is «در {salon}» or, for an independent stylist, «با {first name}».
 */
export const prepaidOutcomeText = (
  outcome: "confirmed" | "cancelled" | "forfeited",
  p: { day: string; time: string; place: string; amount: string; balance: string },
) =>
  fitSms(
    p,
    ["place"],
    (q) =>
      outcome === "confirmed"
        ? `نوبتت ${q.day} ساعت ${q.time} ${q.place} تایید شد.\nپیش‌پرداخت ${q.amount} تومان از کیف پول کسر شد؛ موجودی: ${q.balance} تومان`
        : outcome === "cancelled"
          ? `نوبتت ${q.day} ساعت ${q.time} ${q.place} لغو شد.\nپیش‌پرداخت ${q.amount} تومان به کیف پول برگشت؛ موجودی: ${q.balance} تومان`
          : `نوبتت ${q.day} ساعت ${q.time} ${q.place} لغو شد.\nپیش‌پرداخت ${q.amount} تومان برنمی‌گردد؛ موجودی: ${q.balance} تومان`,
    SMS_TWO_SEGMENTS,
  );

/**
 * To the stylist about one of their prepaid bookings (one segment, the customer's name kept as far as
 * possible — fitNamedBooking): confirmed / cancelled by the salon owner, or cancelled by the customer
 * — refunded while still pending, kept (to the owner's wallet: «به سالن رسید», «به شما رسید» when the
 * stylist is the owner) once confirmed. Not sent when the stylist did it themselves.
 */
export type PrepaidStylistEvent = "confirmed" | "cancelled" | "customer-cancelled" | "customer-cancelled-kept";
export const prepaidStylistText = (event: PrepaidStylistEvent, p: NamedBooking, opts: { ownWallet?: boolean } = {}) => {
  switch (event) {
    case "confirmed":
      return fitNamedBooking(p, (q) => `نوبت پیش‌پرداخت‌شده ${q.customer}، ${q.day} ${q.time} تایید شد`);
    case "cancelled":
      return fitNamedBooking(p, (q) => `نوبت ${q.customer}، ${q.day} ${q.time} لغو شد؛ پیش‌پرداخت به مشتری برگشت`);
    case "customer-cancelled":
      return fitNamedBooking(p, (q) => `${q.customer} نوبت ${q.day} ${q.time} را لغو کرد؛ پیش‌پرداخت به او برگشت`);
    case "customer-cancelled-kept":
      return fitNamedBooking(p, (q) => `${q.customer} نوبت ${q.day} ${q.time} را لغو کرد؛ پیش‌پرداخت به ${opts.ownWallet ? "شما" : "سالن"} رسید`);
  }
};
