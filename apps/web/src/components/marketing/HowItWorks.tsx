import SectionHead from "./SectionHead";

const STEPS = [
  {
    number: "۱",
    title: "سالن را تعریف کنید",
    description: "خدمات، مدت و قیمت هر خدمت، آرایشگرها و ساعت کاری هر نفر را وارد کنید. تعطیلات رسمی به‌صورت خودکار در تقویم می‌آید.",
  },
  {
    number: "۲",
    title: "لینک رزرو را منتشر کنید",
    description: "لینک اختصاصی سالن را در بیو اینستاگرام بگذارید یا کد QR آن را روی میز پذیرش چاپ کنید.",
  },
  {
    number: "۳",
    title: "نوبت‌ها خودکار ثبت می‌شوند",
    description: "مشتری فقط ساعت‌های واقعاً خالی را می‌بیند؛ نوبت تداخلی ثبت نمی‌شود و یادآوری پیامکی خودکار ارسال می‌شود.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHead center kicker="چطور کار می‌کند؟" title="سه قدم تا اولین نوبت آنلاین" />

        <ol className="relative mt-14 grid gap-5 sm:grid-cols-3">
          {/* connecting line behind the step numbers */}
          <span aria-hidden className="absolute inset-x-[16%] top-8 hidden h-px bg-gradient-to-l from-transparent via-g-accent/50 to-transparent sm:block" />
          {STEPS.map((step) => (
            <li key={step.number} className="g-glass-soft g-reveal relative rounded-3xl p-6 transition hover:-translate-y-1 hover:border-g-line-strong">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[image:var(--g-gradient)] text-lg font-black text-[#1a0f14] shadow-[0_10px_30px_-8px_rgb(242_135_106/0.8)]">
                {step.number}
              </span>
              <h3 className="mt-5 text-lg font-bold text-g-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-g-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
