import type { Salon } from "@/types/salon";

const ENGLISH_WEEKDAY: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

function minutesToTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export default function SalonJsonLd({ salon, url }: { salon: Salon; url: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: salon.name,
    description: salon.description ?? undefined,
    image: salon.coverImageUrl,
    telephone: salon.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: salon.address,
      addressLocality: salon.city,
      ...(salon.province && { addressRegion: salon.province }),
      addressCountry: "IR",
    },
    geo: salon.location
      ? {
          "@type": "GeoCoordinates",
          latitude: salon.location.lat,
          longitude: salon.location.lng,
        }
      : undefined,
    aggregateRating: salon.ratingCount > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: salon.ratingAverage,
          ratingCount: salon.ratingCount, // rated reviews only; comment-only reviews carry no rating
        }
      : undefined,
    openingHoursSpecification: salon.workingHours
      .filter((h) => !h.closed)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${ENGLISH_WEEKDAY[h.dayOfWeek]}`,
        opens: minutesToTime(h.startMinute),
        closes: minutesToTime(h.endMinute),
      })),
    url,
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}
