// Values come from .env (NEXT_PUBLIC_THEME_BRAND_*), not hardcoded here, so the palette can be
// changed without touching code. Static per-var access (not a computed key) is required —
// Next.js only inlines NEXT_PUBLIC_ vars it can see as literal `process.env.NEXT_PUBLIC_X`.
const BRAND_25 = process.env.NEXT_PUBLIC_THEME_BRAND_25;
const BRAND_50 = process.env.NEXT_PUBLIC_THEME_BRAND_50;
const BRAND_100 = process.env.NEXT_PUBLIC_THEME_BRAND_100;
const BRAND_200 = process.env.NEXT_PUBLIC_THEME_BRAND_200;
const BRAND_300 = process.env.NEXT_PUBLIC_THEME_BRAND_300;
const BRAND_400 = process.env.NEXT_PUBLIC_THEME_BRAND_400;
const BRAND_500 = process.env.NEXT_PUBLIC_THEME_BRAND_500;
const BRAND_600 = process.env.NEXT_PUBLIC_THEME_BRAND_600;
const BRAND_700 = process.env.NEXT_PUBLIC_THEME_BRAND_700;
const BRAND_800 = process.env.NEXT_PUBLIC_THEME_BRAND_800;
const BRAND_900 = process.env.NEXT_PUBLIC_THEME_BRAND_900;
const BRAND_950 = process.env.NEXT_PUBLIC_THEME_BRAND_950;

/**
 * Overrides the shared `--color-brand-*` scale (defined globally in globals.css for the
 * TailAdmin-derived blue) with the root marketing site's palette, scoped to `.panel-root-theme`.
 * Add that class to a layout's root element to opt that panel into it — used by the customer
 * dashboard, salon owner panel, and stylist panel. The admin panel doesn't use this.
 */
export default function PanelThemeStyle() {
  return (
    <style>{`
      .panel-root-theme {
        --color-brand-25: ${BRAND_25};
        --color-brand-50: ${BRAND_50};
        --color-brand-100: ${BRAND_100};
        --color-brand-200: ${BRAND_200};
        --color-brand-300: ${BRAND_300};
        --color-brand-400: ${BRAND_400};
        --color-brand-500: ${BRAND_500};
        --color-brand-600: ${BRAND_600};
        --color-brand-700: ${BRAND_700};
        --color-brand-800: ${BRAND_800};
        --color-brand-900: ${BRAND_900};
        --color-brand-950: ${BRAND_950};
      }
    `}</style>
  );
}
