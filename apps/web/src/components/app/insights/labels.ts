// Persian names for the analytics breakdown keys (apps/api src/insights).

export const WEEKDAYS_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

/** referrer key → label: "direct", "nobatet", a host, or a type when the host is unknown */
export function referrerLabel(key: string): string {
  if (key === "direct") return "مستقیم (لینک، QR، پیام)";
  if (key === "nobatet") return "جستجو و صفحه‌های نوبتت";
  const k = key.toLowerCase();
  if (k.includes("instagram")) return "اینستاگرام";
  if (k.includes("t.me") || k.includes("telegram")) return "تلگرام";
  if (k.includes("whatsapp")) return "واتس‌اپ";
  if (k.includes("google")) return "گوگل";
  if (k.includes("bing")) return "بینگ";
  if (k.includes("eitaa")) return "ایتا";
  if (k.includes("rubika")) return "روبیکا";
  if (k.includes("bale")) return "بله";
  if (k === "search") return "موتور جستجو";
  if (k === "social") return "شبکه اجتماعی";
  if (k === "external") return "سایت‌های دیگر";
  return key;
}

export const DEVICE_LABEL: Record<string, string> = { mobile: "موبایل", desktop: "کامپیوتر", tablet: "تبلت" };

/** «۲ ساعت» / «۳ روز» */
export function durationLabel(hours: number): string {
  const fa = (n: number) => n.toLocaleString("fa-IR");
  if (hours < 1) return "کمتر از یک ساعت";
  if (hours < 48) return `${fa(Math.round(hours))} ساعت`;
  return `${fa(Math.round(hours / 24))} روز`;
}

const noonOf = (dateKey: string) => new Date(`${dateKey}T08:30:00Z`); // noon in Tehran, safely inside the day
const dayFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", day: "numeric" });
const dayMonthFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "Asia/Tehran", day: "numeric", month: "short" });
/** «۲۸» for a YYYY-MM-DD salon day */
export const jalaliDay = (dateKey: string) => dayFmt.format(noonOf(dateKey));
/** «۲۸ مهر» */
export const jalaliDayMonth = (dateKey: string) => dayMonthFmt.format(noonOf(dateKey));
