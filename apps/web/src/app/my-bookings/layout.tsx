import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

// Standalone customer page (OTP login, no NextAuth) — same app look as the panels, without the tab bar.
export default function MyBookingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="app-root min-h-dvh">
      <header className="app-pt-safe sticky top-0 z-40 border-b border-app-line bg-app-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-2.5 px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-app-accent text-lg font-black text-app-accent-ink">
              {SITE_NAME.slice(0, 1)}
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-black text-app-ink">{SITE_NAME}</span>
              <span className="block text-[11px] font-medium text-app-muted">رزرو آنلاین سالن</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="app-pb-safe app-rise mx-auto max-w-lg px-4 pb-10 pt-3">{children}</main>
    </div>
  );
}
