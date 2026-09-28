"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Container } from "@/components/public/shared/Container";
import { Accordion, type AccordionItemData } from "@/components/public/shared/Accordion";
import { Button } from "@/components/public/shared/Button";
import { SignalPath } from "@/components/public/shared/SignalPath";

export default function FaqPageClient() {
  const [faqs, setFaqs] = useState<AccordionItemData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/faqs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFaqs(data.map((f) => ({ id: f.id, question: f.question, answer: f.answer })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative overflow-hidden">

      <Container size="md" className="relative pb-24 pt-20">

        {/* Header */}
        <Reveal className="text-center">
          <span className="inline-block rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-brand-600 shadow-theme-xs backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:text-g-accent">
            پرسش و پاسخ
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-g-ink sm:text-5xl">
            سوالات متداول
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-500 dark:text-g-muted">
            پاسخ رایج‌ترین سوال‌ها درباره نوبتا را اینجا پیدا کنید.
          </p>
          <p className="mt-2 text-sm text-gray-400 dark:text-g-faint">
            پاسخ سوال خود را نیافتید؟{" "}
            <Link href="/contact" className="font-semibold text-brand-600 hover:underline dark:text-g-accent">
              با ما در تماس باشید
            </Link>
          </p>
        </Reveal>

        {/* FAQ list */}
        <div className="mt-12">
          {loading && (
            <div className="flex justify-center py-16">
              <SignalPath variant="loader" />
            </div>
          )}

          {!loading && faqs.length === 0 && (
            <div className="py-20 text-center text-gray-400 dark:text-g-faint">
              سوالی برای نمایش وجود ندارد.
            </div>
          )}

          {!loading && faqs.length > 0 && (
            <Reveal delay={0.05}>
              <Accordion items={faqs} />
            </Reveal>
          )}
        </div>

        {/* CTA strip */}
        {!loading && (
          <Reveal delay={0.1} className="mt-16 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-g-accent-2/5 px-8 py-10 text-center dark:border-brand-800/30 dark:from-brand-500/5 dark:to-g-accent-2/5">
            <p className="text-base font-semibold text-gray-800 dark:text-g-ink">
              هنوز سوال دارید؟
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-g-muted">
              تیم پشتیبانی ما آماده پاسخگویی است.
            </p>
            <Button href="/contact" className="mt-5" endIcon={<ArrowLeft className="h-4 w-4" />}>
              تماس با ما
            </Button>
          </Reveal>
        )}
      </Container>
    </div>
  );
}
