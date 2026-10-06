import { cache } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/errorLog";
import { SITE_KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/site";
import { PAGE_SEO_DEFAULTS, type PageSeoKey, type PageSeoValues } from "@/lib/pageSeoDefaults";

// Search-engine title / description / keywords of the public pages, edited at /admin/seo-settings
// (PageSeo rows, one per key). An empty field — or no row, or the database being unreachable —
// falls back to the default in pageSeoDefaults.ts, so a page never loses its metadata.

export { PAGE_SEO_DEFAULTS, type PageSeoKey } from "@/lib/pageSeoDefaults";

/** The values in force for a page: the admin's, field by field, over the defaults. One query per request. */
export const getPageSeo = cache(async (key: PageSeoKey): Promise<PageSeoValues> => {
  const fallback = PAGE_SEO_DEFAULTS[key];
  const row = await prisma.pageSeo.findUnique({ where: { key } }).catch((error: unknown) => {
    // P2021 = no such table: a build running before its deploy's migration — the defaults are right then
    if ((error as { code?: string })?.code !== "P2021") void logError({ error, path: `page-seo:${key}` });
    return null;
  });
  return {
    title: row?.title.trim() || fallback.title,
    description: row?.description.trim() || fallback.description,
    keywords: row?.keywords.length ? row.keywords : fallback.keywords,
  };
});

/** `{name}`, `{city}`… in a template (salon page entries). */
export function fillSeoTemplate(template: string, vars: Record<string, string | null | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Metadata for a public page from its SEO entry: title (with « | نوبتت» from the root template,
 * except the home page, whose title is used as is), description, keywords (the site's list when
 * the page has none — an empty value would clear the layout's), canonical URL and share cards.
 */
export async function seoMetadata(key: PageSeoKey, path: string, opts: { absoluteTitle?: boolean } = {}): Promise<Metadata> {
  const seo = await getPageSeo(key);
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  const fullTitle = opts.absoluteTitle ? seo.title : `${seo.title} | ${SITE_NAME}`;
  return {
    title: opts.absoluteTitle ? { absolute: seo.title } : seo.title,
    description: seo.description,
    keywords: seo.keywords.length ? seo.keywords : SITE_KEYWORDS,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description: seo.description,
      url,
      type: "website",
      siteName: SITE_NAME,
      locale: "fa_IR",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: fullTitle }],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description: seo.description, images: ["/opengraph-image"] },
  };
}
