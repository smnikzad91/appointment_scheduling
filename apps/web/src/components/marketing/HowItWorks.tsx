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
    <section className="bg-[#f7f0e8] py-20">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <span className="text-sm font-bold text-[#a34a30]">چطور کار می‌کند؟</span>
        <h2 className="mt-3 text-3xl font-extrabold text-[#2a1d26] sm:text-4xl">سه قدم تا اولین نوبت آنلاین</h2>

        <div className="mt-12 grid gap-6 text-start sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="rounded-2xl bg-[#f3e2d1] p-6">
              <span className="text-3xl font-extrabold text-[#a34a30]">{step.number}</span>
              <h3 className="mt-4 text-lg font-bold text-[#2a1d26]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
