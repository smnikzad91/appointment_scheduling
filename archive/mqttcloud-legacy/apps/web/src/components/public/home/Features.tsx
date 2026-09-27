import { BarChart3, Lock, Plug, Settings2, ShieldCheck, Zap } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/public/shared/Stagger";
import { SectionHeading } from "@/components/public/shared/SectionHeading";
import { Container } from "@/components/public/shared/Container";

const features = [
  {
    title: "پیام‌رسانی بی‌درنگ",
    desc: "بروکر Aedes با تأخیر بسیار پایین، پیام‌های شما را در کسری از ثانیه بین دستگاه‌ها منتشر می‌کند.",
    icon: Zap,
  },
  {
    title: "اتصال امن با TLS",
    desc: "هر اتصال با گواهی TLS رمزنگاری می‌شود و احراز هویت هر دستگاه با اکانت اختصاصی خودش انجام می‌گیرد.",
    icon: ShieldCheck,
  },
  {
    title: "namespace امن برای تاپیک‌ها",
    desc: "هر اکانت فقط به تاپیک‌های زیرمجموعهٔ نام‌کاربری خودش دسترسی دارد؛ داده کاربران کاملاً از هم جداست.",
    icon: Lock,
  },
  {
    title: "مدیریت بدون کدنویسی",
    desc: "اکانت و دستگاه جدید را از داشبورد در چند کلیک بسازید؛ بدون نیاز به تنظیم دستی سرور.",
    icon: Settings2,
  },
  {
    title: "فعالیت اتصال لحظه‌ای",
    desc: "وضعیت آنلاین یا آفلاین هر دستگاه و تاریخچه اتصال آن را به‌صورت زنده در داشبورد دنبال کنید.",
    icon: BarChart3,
  },
  {
    title: "آماده برای توسعه‌دهندگان",
    desc: "با هر کتابخانه استاندارد MQTT (mqtt.js، paho، mosquitto) مستقیم به بروکر mqttcloud.ir وصل شوید.",
    icon: Plug,
  },
];

export default function Features() {
  return (
    <section id="features" className="relative bg-gray-50 dark:bg-gray-900/50">
      <Container className="py-24">
        <SectionHeading
          eyebrow="امکانات"
          title="همه چیزی که برای پیام‌رسانی IoT نیاز دارید"
          description="mqttcloud.ir را یک‌بار راه‌اندازی کنید و با خیال راحت روی محصول خودتان تمرکز کنید."
        />

        <Stagger className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
          {features.map((f) => (
            <StaggerItem
              key={f.title}
              className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/30"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-brand-500/25 via-theme-purple-500/10 to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-theme-purple-500 text-white shadow-lg shadow-brand-500/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <f.icon className="h-6 w-6" aria-hidden="true" />
              </div>

              <h3 className="mt-5 text-base font-bold text-gray-900 dark:text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {f.desc}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
