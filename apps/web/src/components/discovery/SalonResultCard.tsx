import Link from "next/link";
import { MapPin, Navigation, Star } from "lucide-react";
import type { SalonCard } from "@/lib/api/discovery";
import { formatToman, toPersianDigits } from "@/lib/persian";
import FavoriteButton from "@/components/common/FavoriteButton";
import Sep from "@/components/common/Sep";

/** "۸۵۰ متر" / "۳٫۲ کیلومتر". */
export function formatDistance(km: number) {
  if (km < 1) return `${toPersianDigits(Math.max(50, Math.round((km * 1000) / 50) * 50))} متر`;
  return `${toPersianDigits(String(km < 10 ? Math.round(km * 10) / 10 : Math.round(km)).replace(".", "٫"))} کیلومتر`;
}

export default function SalonResultCard({ salon, style }: { salon: SalonCard; style?: React.CSSProperties }) {
  return (
    <Link
      href={`/s/${salon.slug}`}
      style={style}
      className="app-rise flex gap-3 rounded-3xl border border-app-line bg-app-card p-3 shadow-app transition active:scale-[0.99]"
    >
      <span className="relative h-[92px] w-[92px] shrink-0 overflow-hidden rounded-2xl bg-app-card-2">
        {salon.coverImageUrl || salon.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(salon.coverImageUrl ?? salon.logoUrl)!} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-3xl font-black text-app-accent">{salon.name.slice(0, 1)}</span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-black text-app-ink">{salon.name}</span>
            <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-app-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {salon.city}
                {salon.province && salon.province !== salon.city ? `، ${salon.province}` : ""}
              </span>
            </span>
          </span>
          <FavoriteButton salonId={salon.id} salonName={salon.name} className="-me-1 -mt-1 h-9 w-9" />
        </span>
        <span className="mt-1.5 flex flex-wrap items-center text-xs text-app-muted">
          {salon.rating !== null ? (
            <span className="inline-flex items-center gap-1 font-bold text-app-ink">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              {toPersianDigits(salon.rating.toFixed(1))}
              <span className="font-normal text-app-muted">({toPersianDigits(salon.ratingCount)})</span>
            </span>
          ) : (
            <span>بدون امتیاز</span>
          )}
          {salon.distanceKm !== null && (
            <>
              <Sep />
              <span className="inline-flex items-center gap-1 font-bold text-app-accent">
                <Navigation className="h-3.5 w-3.5" aria-hidden />
                {formatDistance(salon.distanceKm)}
              </span>
            </>
          )}
        </span>
        {salon.services.length > 0 && (
          <span className="mt-1.5 truncate text-xs text-app-muted">
            {salon.services.join("، ")}
            {salon.serviceCount > salon.services.length && ` و ${toPersianDigits(salon.serviceCount - salon.services.length)} خدمت دیگر`}
          </span>
        )}
        {salon.minPriceToman !== null && (
          <span className="mt-auto pt-1 text-xs text-app-muted">
            از <span className="font-bold text-app-ink">{formatToman(salon.minPriceToman)}</span>
          </span>
        )}
      </span>
    </Link>
  );
}
