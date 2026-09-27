import { ArrowLeft, Check } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { Container } from "@/components/public/shared/Container";
import { Button } from "@/components/public/shared/Button";
import { AmbientGlow } from "@/components/public/shared/AmbientGlow";

const highlights = ["بدون کدنویسی", "بروکر MQTT امن با TLS", "پشتیبانی ۲۴ ساعته", "رایگان شروع کنید"];

export default function CtaSection() {
  return (
    <section className="relative bg-gray-50 py-8 dark:bg-gray-900/50">
      <Container size="md">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950 bg-[length:200%_200%] px-8 py-16 text-center [animation:gradient-shift_10s_ease_infinite] sm:px-16">
            <AmbientGlow className="left-[calc(50%-210px)] top-[calc(50%-210px)] h-[420px] w-[420px] bg-brand-500/25 blur-[120px]" duration={16} />
            <AmbientGlow className="-left-16 -bottom-20 h-[300px] w-[300px] bg-theme-purple-500/20 blur-[110px]" duration={22} />
            <AmbientGlow className="-right-12 -top-16 h-[260px] w-[260px] bg-theme-pink-500/15 blur-[110px]" duration={26} />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                بدون نیاز به کارت بانکی
              </span>

              <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                همین الان شروع کنید
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-brand-100">
                اولین اکانت MQTT خود را در کمتر از یک دقیقه بسازید. پلن رایگان برای همیشه رایگان است.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  href="/signup"
                  size="lg"
                  endIcon={<ArrowLeft className="h-4 w-4" />}
                  className="bg-none bg-white text-brand-600 hover:bg-brand-50"
                >
                  ثبت‌نام رایگان
                </Button>
                <Button
                  href="/pricing"
                  variant="secondary"
                  size="lg"
                  className="border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20 dark:border-white/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                >
                  مشاهده تعرفه‌ها
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-brand-100/80">
                {highlights.map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 shrink-0 text-success-300" strokeWidth={3} aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
