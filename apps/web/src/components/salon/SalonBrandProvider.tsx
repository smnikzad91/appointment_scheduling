import { darken, withAlpha } from "@/lib/color";

export default function SalonBrandProvider({
  brandColor,
  children,
}: {
  brandColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={
        {
          "--salon-brand": brandColor,
          "--salon-brand-dark": darken(brandColor, 0.15),
          "--salon-brand-soft": withAlpha(brandColor, 0.1),
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
