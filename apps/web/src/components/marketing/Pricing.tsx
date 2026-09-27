import Link from "next/link";

const PLANS = [
  {
    name: "پایه",
    recommended: false,
    features: ["یک آرایشگر", "صفحه رزرو آنلاین و لینک اختصاصی", "[تعداد] پیامک یادآوری در ماه"],
    cta: { label: "انتخاب پلن", href: "/signup-salon" },
  },
  {
    name: "حرفه‌ای",
    recommended: true,
    features: [
      "تا [تعداد] آرایشگر با اپ اختصاصی",
      "بیعانه آنلاین با درگاه بانکی",
      "پرونده مشتری و گزارش‌ها",
      "[تعداد] پیامک یادآوری در ماه",
    ],
    cta: { label: "انتخاب پلن", href: "/signup-salon" },
  },
  {
    name: "چندشعبه",
    recommended: false,
    features: ["چند شعبه با مدیریت یکجا", "سطح دسترسی برای مدیر و پذیرش", "گزارش تجمیعی همه شعبه‌ها"],
    cta: { label: "تماس با ما", href: "/contact" },
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-[#f7f0e8] py-20">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <span className="text-sm font-bold text-[#a34a30]">تعرفه‌ها</span>
        <h2 className="mt-3 text-3xl font-extrabold text-[#2a1d26] sm:text-4xl">متناسب با اندازه سالن شما</h2>
        <p className="mt-4 text-gray-600">[مدت دوره آزمایشی] روز استفاده رایگان از همه امکانات</p>

        <div className="mt-12 grid gap-6 text-start sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl bg-white p-8 ${
                plan.recommended ? "border-2 border-[#a34a30]" : "border border-black/5"
              }`}
            >
              {plan.recommended && (
                <span className="mb-3 inline-block w-fit rounded-full bg-[#f3e2d1] px-3 py-1 text-xs font-bold text-[#a34a30]">
                  پیشنهادی
                </span>
              )}
              <h3 className="text-lg font-bold text-[#2a1d26]">{plan.name}</h3>
              <p className="mt-2 text-2xl font-extrabold text-[#2a1d26]">
                [قیمت] <span className="text-sm font-normal text-gray-500">تومان / ماه</span>
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm text-gray-600">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <Link
                href={plan.cta.href}
                className={`mt-8 rounded-lg px-4 py-3 text-center text-sm font-bold transition ${
                  plan.recommended
                    ? "bg-[#a34a30] text-white hover:bg-[#8f3f28]"
                    : "border border-[#2a1d26]/15 text-[#2a1d26] hover:border-[#2a1d26]/30"
                }`}
              >
                {plan.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
