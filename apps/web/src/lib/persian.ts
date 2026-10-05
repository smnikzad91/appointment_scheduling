const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const ARABIC_INDIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Converts English (and Arabic-Indic) digits in a string/number to Persian digits. */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Converts Persian or Arabic-Indic digits a user typed back to plain English digits. */
export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d))).replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}

/** Formats an integer Toman amount with Persian thousands separators and digits, e.g. 450000 -> "۴۵۰٬۰۰۰ تومان" */
export function formatToman(amount: number): string {
  const grouped = Math.round(amount).toLocaleString("en-US").replace(/,/g, "٬");
  return `${toPersianDigits(grouped)} تومان`;
}


const IRANIAN_MOBILE = /^09[0-9]{9}$/;

/**
 * An Iranian mobile as typed — «09121234567», «+989121234567», «00989121234567», «989121234567»,
 * Persian digits, spaces or dashes — as the stored form «09121234567». Anything else comes back
 * digits-normalized and unchanged, for the caller's validation to reject.
 */
export function normalizeIranianMobile(input: string): string {
  const s = normalizeDigits(input).replace(/[\s\-()]/g, "");
  const m = /^(?:\+98|0098|98)(9\d{9})$/.exec(s);
  return m ? `0${m[1]}` : s;
}

/** Validates a normalized (English-digit) Iranian mobile number: 09xxxxxxxxx */
export function isValidIranianMobile(phone: string): boolean {
  return IRANIAN_MOBILE.test(normalizeDigits(phone));
}

/** Formats minutes-from-midnight as a Persian-digit "HH:MM" string, e.g. 570 -> "۰۹:۳۰" */
export function formatMinutesAsClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const clock = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return toPersianDigits(clock);
}

