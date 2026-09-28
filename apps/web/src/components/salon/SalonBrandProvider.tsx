import { darken, readableOnDark, withAlpha } from "@/lib/color";

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
          "--salon-brand-soft": withAlpha(brandColor, 0.14),
          // text/icons in the brand colour — the page is dark, so a dark brand colour is lifted
          "--salon-brand-ink": readableOnDark(brandColor),
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
