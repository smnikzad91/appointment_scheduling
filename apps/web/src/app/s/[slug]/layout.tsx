import GuestBackdrop from "@/components/guest/GuestBackdrop";

// Same guest theme as the landing page and /salons, so search → salon page keeps one look.
// The salon's own colour comes from SalonBrandProvider (--salon-brand, --salon-brand-ink for text).
export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="app-root guest-root min-h-screen overflow-x-clip">
      <GuestBackdrop />
      {children}
    </div>
  );
}
