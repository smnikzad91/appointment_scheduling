import type { Metadata } from "next";
import { fillSeoTemplate, getPageSeo } from "@/lib/pageSeo";
import { notFound } from "next/navigation";
import { getSalonBySlug } from "@/lib/api/salons";
import SalonBrandProvider from "@/components/salon/SalonBrandProvider";
import { BookingProvider, type BookingPrefill } from "@/components/salon/booking/BookingProvider";
import { addDaysToDateKey, toSalonWallTime } from "@/lib/salonTime";
import type { Salon } from "@/types/salon";
import BookingSheet from "@/components/salon/booking/BookingSheet";
import StickyBookButton from "@/components/salon/StickyBookButton";
import GuestTabBar from "@/components/guest/GuestTabBar";
import SalonJsonLd from "@/components/salon/SalonJsonLd";
import Hero from "@/components/salon/Hero";
import ServiceCategoryGroup from "@/components/salon/ServiceCategoryGroup";
import StylistList from "@/components/salon/StylistList";
import Gallery from "@/components/salon/Gallery";
import Reviews from "@/components/salon/Reviews";
import InfoSection from "@/components/salon/InfoSection";
import { SITE_URL } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ book?: string; services?: string; stylist?: string; date?: string }>;
}

/**
 * `?book=1&services=a,b&stylist=x&date=YYYY-MM-DD` opens the booking sheet pre-filled ("رزرو
 * دوباره", a waitlist notice). Anything that no longer exists is dropped: inactive services, a
 * stylist who left or doesn't do all of them, a day outside the next two weeks.
 */
function bookingPrefill(salon: Salon, sp: Awaited<PageProps["searchParams"]>): BookingPrefill | null {
  if (sp.book !== "1") return null;
  const active = new Set(salon.services.filter((s) => s.active).map((s) => s.id));
  const serviceIds = [...new Set((sp.services ?? "").split(",").filter((id) => active.has(id)))];
  const stylist = salon.stylists.find((s) => s.id === sp.stylist);
  const offersAll = stylist && serviceIds.every((id) => stylist.services.some((x) => x.serviceId === id));
  const today = toSalonWallTime(new Date(), salon.timezone).dateKey;
  const dateKey = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) && sp.date >= today && sp.date <= addDaysToDateKey(today, 13) ? sp.date : null;
  // A stylist's own link (/book/@handle) comes with no services: preselect them for whatever's picked.
  return { serviceIds, stylistId: stylist && (serviceIds.length === 0 || offersAll) ? stylist.id : null, dateKey };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);
  if (!salon) return {};
  const seo = await getPageSeo(salon.kind === "INDEPENDENT" ? "independent-page" : "salon-page");
  const vars = { name: salon.name, city: salon.city };
  const description = salon.description || fillSeoTemplate(seo.description, vars);
  const title = fillSeoTemplate(seo.title, vars);
  return {
    title,
    description,
    ...(seo.keywords.length ? { keywords: seo.keywords } : {}),
    // Prefill links (?book=1…) are the same page — point search engines at the clean URL.
    alternates: { canonical: `${SITE_URL}/s/${encodeURIComponent(slug)}` },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fa_IR",
      images: [{ url: `/s/${slug}/opengraph-image`, width: 1200, height: 630, alt: salon.name }],
    },
  };
}

export default async function SalonPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);

  if (!salon) notFound();
  const prefill = bookingPrefill(salon, await searchParams);

  return (
    <SalonBrandProvider brandColor={salon.brandColor}>
      <BookingProvider salon={salon} prefill={prefill}>
        <SalonJsonLd salon={salon} url={`${SITE_URL}/s/${slug}`} />

        {/* room for the floating «رزرو نوبت» bar; GuestTabBar adds its own spacer */}
        <div className="pb-20 sm:pb-8">
          <Hero salon={salon} />
          <div className="divide-y divide-g-line">
            <ServiceCategoryGroup salon={salon} />
            {/* An independent stylist is the whole business: no list of one. */}
            {salon.kind !== "INDEPENDENT" && <StylistList salon={salon} />}
            <Gallery images={salon.gallery} />
            <Reviews salon={salon} />
            <InfoSection salon={salon} />
          </div>
        </div>

        <StickyBookButton />
        <GuestTabBar />
        <BookingSheet />
      </BookingProvider>
    </SalonBrandProvider>
  );
}
