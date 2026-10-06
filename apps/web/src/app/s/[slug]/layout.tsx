import { notFound } from "next/navigation";
import GuestBackdrop from "@/components/guest/GuestBackdrop";
import { getSalonBySlug } from "@/lib/api/salons";

// Same guest theme as the landing page and /salons, so search → salon page keeps one look.
// The salon's own colour comes from SalonBrandProvider (--salon-brand, --salon-brand-ink for text).
//
// The salon is looked up here, not only in page.tsx: loading.tsx wraps the page in a Suspense
// boundary, so by the time the page runs the response has started streaming with status 200 and
// its notFound() can no longer change it. The layout sits outside that boundary, so an unknown or
// inactive slug gets a real 404 (rendered by ../not-found.tsx). getSalonBySlug is cache()d, so the
// page and generateMetadata reuse this same fetch.
export default async function SalonLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await getSalonBySlug(slug))) notFound();

  return (
    <div dir="rtl" className="app-root guest-root min-h-screen overflow-x-clip">
      <GuestBackdrop />
      {children}
    </div>
  );
}
