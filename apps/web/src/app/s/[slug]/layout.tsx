// Same warm palette as /salons (app-root tokens remap gray-*/brand-*), so search → salon page
// doesn't switch looks. The salon's own colour comes from SalonBrandProvider (--salon-brand).
export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="app-root min-h-screen">
      {children}
    </div>
  );
}
