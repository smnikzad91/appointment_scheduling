import type { Metadata } from "next";
import { seoMetadata } from "@/lib/pageSeo";
import { LifeBuoy } from "lucide-react";
import TutorialsIndex from "@/components/tutorials/TutorialsIndex";
import { TUTORIALS, TUTORIAL_ROLES, type TutorialRole } from "@/content/tutorials";
import { SITE_NAME } from "@/lib/site";
import { toPersianDigits } from "@/lib/persian";
import { rise } from "@/components/guest/motion";

// Edited at /admin/seo-settings; static pages refresh it every minute
export const revalidate = 60;

export function generateMetadata(): Promise<Metadata> {
  return seoMetadata("tutorials", "/tutorials");
}

export default async function TutorialsPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  const initialRole = TUTORIAL_ROLES.some((r) => r.id === role) ? (role as TutorialRole) : undefined;
  const steps = TUTORIALS.reduce((n, t) => n + t.steps.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
      <header className="mb-6 max-w-2xl">
        <span className="g-kicker g-rise" style={rise(0)}>
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
          مرکز راهنما
        </span>
        <h1 className="g-rise mt-4 text-4xl font-black leading-tight text-g-ink sm:text-5xl" style={rise(1)}>
          هر کاری در {SITE_NAME}، <span className="g-gradient-text">قدم‌به‌قدم</span>
        </h1>
        <p className="g-rise mt-4 text-[15px] leading-8 text-g-muted" style={rise(2)}>
          {toPersianDigits(TUTORIALS.length)} راهنمای تصویری در {toPersianDigits(steps)} مرحله، با همان صفحه‌هایی که در اپ می‌بینید. نقش خود را انتخاب کنید یا
          دنبال کاری که می‌خواهید انجام دهید بگردید.
        </p>
      </header>
      <TutorialsIndex initialRole={initialRole} />
    </div>
  );
}
