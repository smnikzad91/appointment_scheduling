import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSalonBySlug } from "@/lib/api/salons";
import SalonBrandProvider from "@/components/salon/SalonBrandProvider";
import { BookingProvider } from "@/components/salon/booking/BookingProvider";
import BookingSheet from "@/components/salon/booking/BookingSheet";
import StickyBookButton from "@/components/salon/StickyBookButton";
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
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);
  if (!salon) return {};

  return {
    title: salon.name,
    description: salon.description ?? undefined,
    openGraph: {
      title: salon.name,
      description: salon.description ?? undefined,
      type: "website",
      locale: "fa_IR",
      images: [{ url: `/s/${slug}/opengraph-image`, width: 1200, height: 630, alt: salon.name }],
    },
  };
}

export default async function SalonPage({ params }: PageProps) {
  const { slug } = await params;
  const salon = await getSalonBySlug(slug);

  if (!salon) notFound();

  return (
    <SalonBrandProvider brandColor={salon.brandColor}>
      <BookingProvider salon={salon}>
        <SalonJsonLd salon={salon} url={`${SITE_URL}/s/${slug}`} />

        <div className="pb-20 sm:pb-8">
          <Hero salon={salon} />
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <ServiceCategoryGroup salon={salon} />
            <StylistList salon={salon} />
            <Gallery images={salon.gallery} />
            <Reviews salon={salon} />
            <InfoSection salon={salon} />
          </div>
        </div>

        <StickyBookButton />
        <BookingSheet />
      </BookingProvider>
    </SalonBrandProvider>
  );
}
