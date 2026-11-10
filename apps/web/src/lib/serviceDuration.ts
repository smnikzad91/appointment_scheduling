import { toPersianDigits } from "@/lib/persian";

/** A service (or a stylist's own length for it) lasts at most this long — apps/api checks the same (MAX_SERVICE_MINUTES). */
export const MAX_SERVICE_MINUTES = 600;
export const MIN_SERVICE_MINUTES = 5;

/** «۴۵ دقیقه», «۱ ساعت», «۲ ساعت و ۳۰ دقیقه» */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${toPersianDigits(m)} دقیقه`;
  return m ? `${toPersianDigits(h)} ساعت و ${toPersianDigits(m)} دقیقه` : `${toPersianDigits(h)} ساعت`;
}
