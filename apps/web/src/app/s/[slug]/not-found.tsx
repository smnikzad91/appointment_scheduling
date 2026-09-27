import Link from "next/link";
import { SearchX } from "lucide-react";
import { vazirmatn } from "@/fonts/vazirmatn";

export default function SalonNotFound() {
  return (
    <div
      className={`${vazirmatn.variable} flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-4 text-center dark:bg-gray-950`}
      style={{ fontFamily: "var(--font-vazirmatn-salon), sans-serif" }}
    >
      <SearchX className="h-10 w-10 text-gray-400" aria-hidden />
      <h1 className="text-lg font-bold">این سالن پیدا نشد</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">لینک را دوباره بررسی کنید یا با سالن تماس بگیرید.</p>
      <Link href="/" className="mt-2 text-sm font-medium underline">
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}
