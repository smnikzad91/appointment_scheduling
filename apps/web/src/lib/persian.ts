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

