import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import GuestBackdrop from "@/components/guest/GuestBackdrop";
import { SalonApiError, salonApiFetch } from "@/lib/api/salonApiClient";
import PromoSmsChoice from "./PromoSmsChoice";

// The link in a "time to book again" SMS (apps/api RebookReminderService): book again at that
// salon, or stop these promotional texts. The code in the URL is the only credential (8 random
// chars, sent only to that customer's phone); apps/api reveals nothing but the salon and the choice.

export const metadata: Metadata = { title: "نوبت بعدی", robots: { index: false, follow: false } };

interface RebookLink {
  salon: { name: string; slug: string };
  optedOut: boolean;
}

export default async function RebookLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  let link: RebookLink;
  try {
    link = await salonApiFetch<RebookLink>(`/rebook/${encodeURIComponent(code)}`, { cache: "no-store" });
  } catch (err) {
    if (err instanceof SalonApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div dir="rtl" className="app-root guest-root min-h-screen overflow-x-clip">
      <GuestBackdrop />
      <main className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-4 py-10 text-center">
        <div className="g-glass rounded-3xl p-6">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
            <CalendarPlus className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="text-xl font-black text-g-ink">وقت نوبت بعدی در {link.salon.name}</h1>
          <p className="mt-2 text-sm leading-7 text-g-muted">زمان مناسب را انتخاب کنید و آنلاین رزرو کنید.</p>
          <Link href={`/s/${link.salon.slug}?book=1`} className="g-btn-primary mt-5 flex h-12 items-center justify-center rounded-2xl font-bold">
            رزرو نوبت
          </Link>
        </div>
        <PromoSmsChoice code={code} initialOptedOut={link.optedOut} />
      </main>
    </div>
  );
}
