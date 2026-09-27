import type { Metadata } from "next";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { findProvince } from "@appointment-scheduling/iran-locations";
import SalonSearch from "@/components/discovery/SalonSearch";
import { SITE_NAME, SITE_URL } from "@/lib/site";

interface PageProps {
  searchParams: Promise<{ province?: string; city?: string; q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { province, city } = await searchParams;
  const where = city || province;
  const title = where ? `سالن‌های زیبایی ${where}` : "جستجوی سالن زیبایی";
  return {
    title,
    description: `${title} — مقایسه امتیاز، خدمات و فاصله، و رزرو آنلاین نوبت در ${SITE_NAME}.`,
    alternates: { canonical: `${SITE_URL}/salons` },
  };
}

/** Public salon discovery — a phone-first page in the app's look, no sign-in needed. */
export default async function SalonsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const province = findProvince(sp.province ?? "")?.name ?? "";
  const city = province && sp.city && findProvince(province)!.cities.includes(sp.city) ? sp.city : "";
  return (
    <div dir="rtl" className="app-root min-h-dvh">
      <header className="app-pt-safe sticky top-0 z-40 border-b border-app-line bg-app-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-black text-app-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-accent text-app-accent-ink">
              <Calendar className="h-4 w-4" aria-hidden />
            </span>
            {SITE_NAME}
          </Link>
          <Link href="/signin?callbackUrl=%2Fsalons" className="rounded-full bg-app-card-2 px-4 py-2 text-sm font-bold text-app-ink">
            ورود
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-16 pt-5">
        <h1 className="text-[26px] font-black leading-tight text-app-ink">سالن زیبایی پیدا کنید</h1>
        <p className="mb-4 mt-1 text-sm text-app-muted">بر اساس شهر، خدمت یا نزدیک‌ترین سالن به شما — و همین‌جا نوبت بگیرید.</p>
        <SalonSearch initial={{ province, city, q: sp.q?.slice(0, 60) }} />
      </main>
    </div>
  );
}
