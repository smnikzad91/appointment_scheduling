import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { getShowcase, type Showcase as ShowcaseData, type ShowcaseSalon, type ShowcaseStylist } from "@/lib/api/showcase";
import { toPersianDigits } from "@/lib/persian";

// Home page showcase (edited in /admin/homepage): supplier banner, featured salons and stylists
// in the admin's priority order, and top-rated salons/stylists from approved reviews. Each part
// is hidden when it has nothing to show; if apps/api is unreachable the landing page still renders.

export default async function Showcase() {
  let data: ShowcaseData;
  try {
    data = await getShowcase();
  } catch {
    return null;
  }
  const { banner, featuredSalons, featuredStylists, topSalons, topStylists } = data;
  if (!banner && !featuredSalons.length && !featuredStylists.length && !topSalons.length && !topStylists.length) return null;

  return (
    <div id="discover" className="bg-[#f7f0e8] pb-8">
      {banner && <SupplierBanner banner={banner} />}

      {featuredSalons.length > 0 && (
        <Section kicker="انتخاب نوبتا" title="سالن‌های منتخب">
          <Row>
            {featuredSalons.map((s, i) => (
              <SalonCard key={s.id} salon={s} featured={i === 0} />
            ))}
          </Row>
        </Section>
      )}

      {featuredStylists.length > 0 && (
        <Section kicker="انتخاب نوبتا" title="آرایشگرهای منتخب">
          <Row>
            {featuredStylists.map((s) => (
              <StylistCard key={s.id} stylist={s} />
            ))}
          </Row>
        </Section>
      )}

      {topSalons.length > 0 && (
        <Section kicker="بر اساس امتیاز مشتری‌ها" title="محبوب‌ترین سالن‌ها">
          <Ranked>
            {topSalons.map((s, i) => (
              <RankRow
                key={s.id}
                rank={i + 1}
                href={`/s/${s.slug}`}
                image={s.logoUrl}
                name={s.name}
                sub={s.city}
                rating={s.rating}
                count={s.ratingCount}
              />
            ))}
          </Ranked>
        </Section>
      )}

      {topStylists.length > 0 && (
        <Section kicker="بر اساس امتیاز مشتری‌ها" title="برترین آرایشگرها">
          <Ranked>
            {topStylists.map((s, i) => (
              <RankRow
                key={s.id}
                rank={i + 1}
                href={`/s/${s.salon.slug}#stylists`}
                image={s.avatarUrl}
                round
                name={s.displayName}
                sub={s.salon.name}
                rating={s.rating}
                count={s.ratingCount}
              />
            ))}
          </Ranked>
        </Section>
      )}
    </div>
  );
}

function SupplierBanner({ banner }: { banner: NonNullable<ShowcaseData["banner"]> }) {
  const image = (
    <span className="relative block overflow-hidden rounded-3xl shadow-sm ring-1 ring-black/5">
      {/* Same 3:1 shape as the recommended upload on every screen, so an advertiser's text is never cropped. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.imageUrl} alt={banner.title ?? "بنر تامین‌کننده"} className="aspect-[3/1] w-full object-cover" />
      <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">تبلیغ</span>
    </span>
  );
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      {banner.linkUrl ? (
        <a href={banner.linkUrl} target="_blank" rel="sponsored noopener noreferrer" className="block transition hover:opacity-95" aria-label={banner.title ?? "بنر تامین‌کننده"}>
          {image}
        </a>
      ) : (
        image
      )}
    </div>
  );
}

function Section({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <span className="text-sm font-bold text-[#a34a30]">{kicker}</span>
      <h2 className="mt-1 text-2xl font-extrabold text-[#2a1d26] sm:text-3xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Swipeable row on phones, three-column grid from tablets up. */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0">
      {children}
    </div>
  );
}

function RatingBadge({ rating, count }: { rating: number | null; count: number }) {
  if (rating === null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-bold text-[#2a1d26]">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
      {toPersianDigits(rating.toFixed(1))}
      <span className="text-xs font-normal text-gray-500">({toPersianDigits(count)} امتیاز)</span>
    </span>
  );
}

function SalonCard({ salon, featured }: { salon: ShowcaseSalon; featured?: boolean }) {
  return (
    <Link
      href={`/s/${salon.slug}`}
      className="group block w-[78%] shrink-0 snap-start overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto"
    >
      <span className="relative block h-36 bg-gradient-to-br from-[#f3e2d1] to-[#e8cdb4]">
        {salon.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={salon.coverImageUrl} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        )}
        {featured && <span className="absolute right-3 top-3 rounded-full bg-[#a34a30] px-2.5 py-0.5 text-[11px] font-bold text-white">ویژه</span>}
      </span>
      <span className="flex items-start gap-3 p-4">
        <span className="relative z-10 -mt-10 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#2a1d26] text-lg font-black text-white shadow-sm ring-4 ring-white">
          {salon.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={salon.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            salon.name.slice(0, 1)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-extrabold text-[#2a1d26]">{salon.name}</span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {salon.city}
          </span>
          <span className="mt-2 flex items-center justify-between gap-2">
            <RatingBadge rating={salon.rating} count={salon.ratingCount} />
            <span className="text-sm font-bold text-[#a34a30]">رزرو نوبت</span>
          </span>
        </span>
      </span>
    </Link>
  );
}

function StylistCard({ stylist }: { stylist: ShowcaseStylist }) {
  return (
    <Link
      href={`/s/${stylist.salon.slug}#stylists`}
      className="block w-[62%] shrink-0 snap-start rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto"
    >
      <span className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#f3e2d1] text-3xl font-black text-[#a34a30] ring-4 ring-[#f7f0e8]">
        {stylist.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stylist.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          stylist.displayName.slice(0, 1)
        )}
      </span>
      <span className="mt-3 block truncate text-lg font-extrabold text-[#2a1d26]">{stylist.displayName}</span>
      <span className="block truncate text-sm text-gray-500">
        {stylist.salon.name}، {stylist.salon.city}
      </span>
      <span className="mt-2 flex justify-center">
        <RatingBadge rating={stylist.rating} count={stylist.ratingCount} />
      </span>
    </Link>
  );
}

function Ranked({ children }: { children: React.ReactNode }) {
  return <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</ol>;
}

function RankRow({
  rank,
  href,
  image,
  round,
  name,
  sub,
  rating,
  count,
}: {
  rank: number;
  href: string;
  image: string | null;
  round?: boolean;
  name: string;
  sub: string;
  rating: number | null;
  count: number;
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
            rank <= 3 ? "bg-[#a34a30] text-white" : "bg-[#f3e2d1] text-[#a34a30]"
          }`}
        >
          {toPersianDigits(rank)}
        </span>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden bg-[#f3e2d1] font-black text-[#a34a30] ${round ? "rounded-full" : "rounded-xl"}`}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            name.slice(0, 1)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold text-[#2a1d26]">{name}</span>
          <span className="block truncate text-xs text-gray-500">{sub}</span>
        </span>
        <RatingBadge rating={rating} count={count} />
      </Link>
    </li>
  );
}
