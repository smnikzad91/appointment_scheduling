import { Accordion } from "@/components/public/shared/Accordion";
import { Reveal } from "@/components/public/shared/Reveal";
import { Container } from "@/components/public/shared/Container";
import type { FaqItem } from "./types";

export default function FaqSection({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) return null;

  return (
    <section className="relative bg-white py-24 dark:bg-gray-900">
      <Container size="md">
        <Reveal className="text-center">
          <span className="inline-block rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1 text-xs font-semibold tracking-wide text-brand-600 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-400">
            پرسش و پاسخ
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            سوالات متداول
          </h2>
          <p className="mt-3 text-base text-gray-500 dark:text-gray-400">
            پاسخ سوال خود را نیافتید؟{" "}
            <a href="/contact" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              با ما در تماس باشید
            </a>
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <Accordion items={faqs.map((f) => ({ id: f._id, question: f.question, answer: f.answer }))} />
        </Reveal>
      </Container>
    </section>
  );
}
