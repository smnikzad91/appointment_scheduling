import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Stagger, StaggerItem } from "@/components/public/shared/Stagger";
import { Container } from "@/components/public/shared/Container";
import { stripHash } from "@/components/public/shared/contentTaxonomy";
import type { FeaturedBlog, FeaturedNews } from "./types";
import { formatDate } from "./utils";

export default function FeaturedContent({
  featuredBlog,
  featuredNews,
}: {
  featuredBlog?: FeaturedBlog | null;
  featuredNews?: FeaturedNews | null;
}) {
  if (!featuredBlog && !featuredNews) return null;

  return (
    <section className="relative bg-white py-16 dark:bg-gray-900">
      <Container size="lg">
        <Reveal className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-success-200 bg-success-50 px-3.5 py-1 text-xs font-semibold tracking-wide text-success-600 dark:border-success-800/40 dark:bg-success-500/10 dark:text-success-400">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
            محتوای ویژه
          </span>
        </Reveal>

        <Stagger className={`grid gap-5 ${featuredBlog && featuredNews ? "sm:grid-cols-2" : ""}`}>
          {/* Featured Blog */}
          {featuredBlog && (
            <StaggerItem>
              <Link href={`/blog/${featuredBlog.slug}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm transition-shadow duration-200 hover:shadow-theme-md dark:border-gray-800 dark:bg-gray-900"
              >
                {featuredBlog.coverImage
                  ? <div className="relative h-44 w-full overflow-hidden">
                      <Image src={featuredBlog.coverImage} alt={featuredBlog.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  : <div className="h-44 w-full bg-brand-500" />
                }
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                      {stripHash(featuredBlog.category)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-600 dark:bg-success-500/10 dark:text-success-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                      پست ویژه
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                    {featuredBlog.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-2 dark:text-gray-400">
                    {featuredBlog.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {featuredBlog.readTime} مطالعه
                  </div>
                </div>
              </Link>
            </StaggerItem>
          )}

          {/* Featured News */}
          {featuredNews && (
            <StaggerItem>
              <Link href={`/news/${featuredNews.id}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm transition-shadow duration-200 hover:shadow-theme-md dark:border-gray-800 dark:bg-gray-900"
              >
                {featuredNews.image
                  ? <div className="relative h-44 w-full overflow-hidden">
                      <Image src={featuredNews.image} alt={featuredNews.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  : <div className="h-44 w-full bg-orange-500" />
                }
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                      {stripHash(featuredNews.category)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-semibold text-success-600 dark:bg-success-500/10 dark:text-success-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
                      تازه‌ترین
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                    {featuredNews.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-2 dark:text-gray-400">
                    {featuredNews.body}
                  </p>
                  {featuredNews.publishedAt && (
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDate(featuredNews.publishedAt)}
                    </div>
                  )}
                </div>
              </Link>
            </StaggerItem>
          )}
        </Stagger>
      </Container>
    </section>
  );
}
