import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";

// Iran's official public holidays, for marking days on the calendars. Keys are "YYYY-MM-DD"
// Gregorian date keys (like toDateKey / salon-local dateKey).
//
// • Solar holidays are fixed in the Jalali calendar — always exact.
// • Religious holidays follow the lunar Hijri calendar, which Iran fixes by moon sighting, so
//   they're computed with the browser's Umm al-Qura calendar and can be a day off. Once the
//   year's official calendar is published (time.ir), put the exact dates in OFFICIAL_OVERRIDES —
//   an entry replaces the computed lunar holidays for that whole Jalali year.

const SOLAR: { month: number; day: number; title: string }[] = [
  { month: 1, day: 1, title: "عید نوروز" },
  { month: 1, day: 2, title: "عید نوروز" },
  { month: 1, day: 3, title: "عید نوروز" },
  { month: 1, day: 4, title: "عید نوروز" },
  { month: 1, day: 12, title: "روز جمهوری اسلامی" },
  { month: 1, day: 13, title: "روز طبیعت" },
  { month: 3, day: 14, title: "رحلت امام خمینی" },
  { month: 3, day: 15, title: "قیام ۱۵ خرداد" },
  { month: 11, day: 22, title: "پیروزی انقلاب اسلامی" },
  { month: 12, day: 29, title: "ملی شدن صنعت نفت" },
];

// Hijri month (1 = Muharram … 12 = Dhu al-Hijjah) and day. day 0 = last day of that month.
const LUNAR: { month: number; day: number; title: string }[] = [
  { month: 1, day: 9, title: "تاسوعای حسینی" },
  { month: 1, day: 10, title: "عاشورای حسینی" },
  { month: 2, day: 20, title: "اربعین حسینی" },
  { month: 2, day: 28, title: "رحلت پیامبر و شهادت امام حسن مجتبی" },
  { month: 2, day: 0, title: "شهادت امام رضا" },
  { month: 3, day: 8, title: "شهادت امام حسن عسکری" },
  { month: 3, day: 17, title: "میلاد پیامبر و امام جعفر صادق" },
  { month: 6, day: 3, title: "شهادت حضرت فاطمه" },
  { month: 7, day: 13, title: "ولادت امام علی" },
  { month: 7, day: 27, title: "مبعث پیامبر" },
  { month: 8, day: 15, title: "ولادت امام زمان" },
  { month: 9, day: 21, title: "شهادت امام علی" },
  { month: 10, day: 1, title: "عید فطر" },
  { month: 10, day: 2, title: "تعطیل به مناسبت عید فطر" },
  { month: 10, day: 25, title: "شهادت امام جعفر صادق" },
  { month: 12, day: 10, title: "عید قربان" },
  { month: 12, day: 18, title: "عید غدیر خم" },
];

/** Exact official dates per Jalali year ("MM-DD" Jalali → title); replaces the computed lunar ones. */
const OFFICIAL_OVERRIDES: Record<number, Record<string, string>> = {};

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

let hijri: Intl.DateTimeFormat | null | undefined;
function hijriParts(d: Date): { month: number; day: number } | null {
  if (hijri === undefined) {
    try {
      hijri = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric", day: "numeric", timeZone: "UTC" });
    } catch {
      hijri = null; // no Hijri calendar in this runtime → solar holidays only
    }
  }
  if (!hijri) return null;
  const parts = hijri.formatToParts(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)));
  return { month: Number(parts.find((p) => p.type === "month")?.value), day: Number(parts.find((p) => p.type === "day")?.value) };
}

const cache = new Map<number, Map<string, string>>();

/** All official holidays of one Jalali year, keyed by Gregorian date key. */
export function holidaysOfJalaliYear(jy: number): Map<string, string> {
  const cached = cache.get(jy);
  if (cached) return cached;
  const out = new Map<string, string>();
  const first = new DateObject({ calendar: persian, year: jy, month: 1, day: 1 });
  const days = first.isLeap ? 366 : 365;
  const override = OFFICIAL_OVERRIDES[jy];

  for (let i = 0; i < days; i++) {
    const jd = new DateObject(first).add(i, "day");
    const date = jd.toDate();
    const key = keyOf(date);
    const md = `${pad(jd.month.number)}-${pad(jd.day)}`;
    const titles: string[] = [];

    const solar = SOLAR.find((h) => h.month === jd.month.number && h.day === jd.day);
    if (solar) titles.push(solar.title);

    if (override) {
      if (override[md] && !solar) titles.push(override[md]);
    } else {
      const h = hijriParts(date);
      if (h) {
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        const lastOfMonth = hijriParts(next)?.month !== h.month;
        for (const l of LUNAR) {
          if (l.month === h.month && (l.day === h.day || (l.day === 0 && lastOfMonth))) titles.push(l.title);
        }
      }
    }
    if (titles.length) out.set(key, titles.join("، "));
  }
  cache.set(jy, out);
  return out;
}

/** The official holiday on a Gregorian date key, or null. */
export function iranHoliday(dateKey: string): string | null {
  const [y, m, d] = dateKey.split("-").map(Number);
  const jy = new DateObject({ date: new Date(y, m - 1, d, 12), calendar: persian }).year;
  return holidaysOfJalaliYear(jy).get(dateKey) ?? null;
}
