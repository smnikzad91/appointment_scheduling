import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import GuestBackdrop from "@/components/guest/GuestBackdrop";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // Always dark (guest theme) — sign-in is also the installed app's first screen.
    <div dir="rtl" className="app-root guest-root min-h-dvh">
      <GuestBackdrop />
      <div className="app-pt-safe app-pb-safe mx-auto flex min-h-dvh max-w-6xl gap-12 px-4 sm:px-6 lg:px-8">
        <main className="flex flex-1 flex-col items-center justify-center py-8">{children}</main>
        <AuthBrandPanel />
      </div>
    </div>
  );
}
