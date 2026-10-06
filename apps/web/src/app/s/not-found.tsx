import Link from "next/link";
import { SearchX } from "lucide-react";
import GuestBackdrop from "@/components/guest/GuestBackdrop";

// Unknown or inactive salon. It lives at /s (not /s/[slug]) because [slug]/layout.tsx calls
// notFound(), and a layout's notFound() is handled by the parent segment's not-found. So it
// brings its own guest-theme wrapper, the same one that layout would have provided.
export default function SalonNotFound() {
  return (
    <div dir="rtl" className="app-root guest-root min-h-screen overflow-x-clip">
      <GuestBackdrop />
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center"
        style={{ fontFamily: "Vazirmatn, Tahoma, sans-serif" }}
      >
        <SearchX className="h-10 w-10 text-g-faint" aria-hidden />
        <h1 className="text-lg font-bold">این سالن پیدا نشد</h1>
        <p className="text-sm text-g-muted">لینک را دوباره بررسی کنید یا با سالن تماس بگیرید.</p>
        <Link href="/" className="mt-2 text-sm font-medium underline">
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </div>
  );
}
