import type { Metadata } from "next";
import Link from "next/link";
import { findProvince } from "@appointment-scheduling/iran-locations";
import SalonSearch from "@/components/discovery/SalonSearch";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import GuestBackdrop from "@/components/guest/GuestBackdrop";
import GuestLogo from "@/components/guest/GuestLogo";
import { rise } from "@/components/guest/motion";
import GuestTabBar from "@/components/guest/GuestTabBar";

interface PageProps {
  searchParams: Promise<{ province?: string; city?: string; q?: string; type?: string }>;
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
    <div dir="rtl" className="app-root guest-root min-h-dvh">
      <GuestBackdrop />
      <header className="app-pt-safe sticky top-0 z-40 border-b border-g-line bg-g-bg/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <GuestLogo />
          <Link href="/signin?callbackUrl=%2Fsalons" className="g-btn g-btn-ghost h-10 px-4 text-sm">
            ورود
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
        <h1 className="g-rise text-[28px] font-black leading-tight text-g-ink" style={rise(0)}>
          سالن زیبایی <span className="g-gradient-text">پیدا کنید</span>
        </h1>
        <p className="g-rise mb-5 mt-2 text-sm leading-7 text-g-muted" style={rise(1)}>
          بر اساس شهر، خدمت یا نزدیک‌ترین سالن به شما — و همین‌جا نوبت بگیرید.
        </p>
        <div className="g-rise" style={rise(2)}>
          <SalonSearch
            initial={{
              province,
              city,
              q: sp.q?.slice(0, 60),
              kind: sp.type === "independent" ? "INDEPENDENT" : sp.type === "salon" ? "SALON" : undefined,
            }}
          />
        </div>
      </main>
      <GuestTabBar />
    </div>
  );
}
