import Link from "next/link";
import { Star, Phone, CalendarCheck } from "lucide-react";
import type { Salon } from "@/types/salon";
import { toPersianDigits } from "@/lib/persian";
import { SocialIcon } from "@/components/common/SocialIcon";
import OpenStatusBadge from "./OpenStatusBadge";
import PlaceholderArt from "./PlaceholderArt";
import FavoriteButton from "@/components/common/FavoriteButton";

export default function Hero({ salon }: { salon: Salon }) {
  const initials = salon.name.trim().slice(0, 1);

  return (
    <section className="relative">
      <div className="relative h-40 w-full overflow-hidden sm:h-56">
        {salon.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={salon.coverImageUrl} alt={salon.name} className="h-full w-full object-cover" />
        ) : (
          <PlaceholderArt seed={`${salon.id}-cover`} className="h-full w-full" />
        )}
        {/* cover fades into the page */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-g-bg to-transparent" />
        <FavoriteButton salonId={salon.id} salonName={salon.name} variant="overlay" className="absolute left-3 top-3" />
      </div>

      <div className="mx-auto max-w-3xl px-4">
        <div className="relative -mt-10 flex items-end gap-4 sm:-mt-12">
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-g-bg text-2xl font-bold text-white shadow-[0_12px_32px_-10px_rgb(0_0_0/0.8)] ring-1 ring-white/15 sm:h-24 sm:w-24"
            style={{ backgroundColor: "var(--salon-brand)" }}
          >
            {salon.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={salon.logoUrl} alt={salon.name} className="h-full w-full rounded-xl object-cover" />
            ) : (
              initials
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-black text-g-ink sm:text-3xl">{salon.name}</h1>
            {salon.description && (
              <p className="mt-1 text-sm leading-relaxed text-g-muted">{salon.description}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {salon.ratingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-sm font-medium">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                {toPersianDigits(salon.ratingAverage.toFixed(1))}
                <span className="font-normal text-g-muted">
                  ({toPersianDigits(salon.ratingCount)} امتیاز)
                </span>
              </span>
            )}
            <OpenStatusBadge workingHours={salon.workingHours} timeZone={salon.timezone} />
          </div>

          <div className="flex gap-2">
            <a
              href={`tel:${salon.phone}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-g-line px-4 py-2 text-sm font-medium text-g-ink transition hover:border-g-line-strong"
            >
              <Phone className="h-4 w-4" aria-hidden />
              تماس
            </a>
            {salon.instagram && (
              <a
                href={`https://instagram.com/${salon.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-g-line px-4 py-2 text-sm font-medium text-g-ink transition hover:border-g-line-strong"
              >
                <SocialIcon platform="instagram" className="h-4 w-4" />
                اینستاگرام
              </a>
            )}
            <Link
              href="/my-bookings"
              className="inline-flex items-center gap-1.5 rounded-full border border-g-line px-4 py-2 text-sm font-medium text-g-ink transition hover:border-g-line-strong"
            >
              <CalendarCheck className="h-4 w-4" aria-hidden />
              نوبت‌های من
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
