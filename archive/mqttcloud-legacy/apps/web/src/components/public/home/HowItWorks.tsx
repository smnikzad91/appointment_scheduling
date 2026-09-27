import { KeyRound, Plug, Radio } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/public/shared/Stagger";
import { SectionHeading } from "@/components/public/shared/SectionHeading";
import { Container } from "@/components/public/shared/Container";

const steps = [
  {
    step: "۱",
    title: "اکانتی بسازید",
    desc: "از داشبورد یک اکانت MQTT با نام‌کاربری و رمز عبور اختصاصی بسازید. بدون کدنویسی.",
    icon: KeyRound,
    preview: (
      <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span dir="ltr" className="font-mono">acme_factory</span>
          <span>·</span>
          <span className="font-semibold text-success-600 dark:text-success-400">فعال</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div className="h-1.5 w-2/5 rounded-full bg-brand-500" />
        </div>
        <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">سقف دستگاه: ۳ — TLS: فعال</p>
      </div>
    ),
  },
  {
    step: "۲",
    title: "دستگاه را متصل کنید",
    desc: "دستگاه یا اپلیکیشن خود را با آدرس بروکر و اطلاعات اکانت به mqttcloud.ir متصل کنید.",
    icon: Plug,
    preview: (
      <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">وضعیت اتصال</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-success-600 dark:text-success-400">
            <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
            فعال
          </span>
        </div>
        {["device-01", "device-02", "device-03"].map((id) => (
          <div key={id} className="flex items-center justify-between py-1">
            <span dir="ltr" className="font-mono text-[11px] text-gray-500 dark:text-gray-400">{id}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">در حال اتصال…</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    step: "۳",
    title: "فعالیت را دنبال کنید",
    desc: "اتصال، قطع اتصال و وضعیت هر دستگاه را به‌صورت لحظه‌ای در داشبورد مشاهده کنید.",
    icon: Radio,
    preview: (
      <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-800/40 dark:bg-brand-900/20">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-theme-purple-500 text-sm font-bold text-white shadow-theme-xs">M</div>
          <div>
            <p className="text-[11px] font-bold text-gray-800 dark:text-white">گزارش mqttcloud.ir</p>
            <p dir="ltr" className="mt-0.5 text-end text-[11px] text-gray-500 dark:text-gray-400">device-01 متصل شد ✓</p>
            <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">همین الان · اتصال</p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-24">
      <Container>
        <SectionHeading
          eyebrow="نحوه کار"
          title="چطور کار می‌کند؟"
          description="در سه قدم ساده، دستگاه‌های خود را به بروکر MQTT وصل کنید."
        />

        <div className="relative mt-16">
          {/* Gradient connector (desktop) */}
          <div className="absolute top-8 right-[calc(16.66%+2rem)] left-[calc(16.66%+2rem)] hidden h-0.5 bg-gradient-to-l from-brand-500 via-theme-purple-500 to-brand-500 opacity-30 sm:block" />

          <Stagger className="grid gap-6 sm:grid-cols-3" stagger={0.15}>
            {steps.map((s) => (
              <StaggerItem key={s.step} className="group relative z-10">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/30">
                  {/* Step number + icon */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-theme-purple-500 text-white shadow-lg shadow-brand-500/25 transition-transform duration-300 group-hover:scale-110">
                      <s.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="rounded-lg bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      مرحله {s.step}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    {s.desc}
                  </p>

                  {s.preview}
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Container>
    </section>
  );
}
