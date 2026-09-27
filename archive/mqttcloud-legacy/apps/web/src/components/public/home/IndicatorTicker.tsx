import { Activity, ShieldCheck, Wifi, Zap } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/public/shared/Stagger";
import { CountUp } from "@/components/public/shared/CountUp";

const stats = [
  { icon: Zap, value: "۵۰ms", label: "میانگین تأخیر", animate: true },
  { icon: ShieldCheck, value: "TLS", label: "اتصال رمزنگاری‌شده", animate: false },
  { icon: Activity, value: "۹۹.۹٪", label: "پایداری بروکر", animate: true },
  { icon: Wifi, value: "۲۴/۷", label: "بروکر همیشه فعال", animate: false },
];

export default function IndicatorTicker() {
  return (
    <div className="border-y border-gray-200 bg-white py-10 dark:border-gray-800 dark:bg-gray-900">
      <Stagger className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6 lg:px-8" stagger={0.1}>
        {stats.map((stat) => (
          <StaggerItem key={stat.label} className="group flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-theme-purple-500 text-white shadow-md shadow-brand-500/20 transition-transform duration-300 group-hover:scale-110">
              <stat.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              {stat.animate ? (
                <CountUp value={stat.value} className="block text-lg font-extrabold text-gray-900 dark:text-white" />
              ) : (
                <p className="text-lg font-extrabold text-gray-900 dark:text-white">{stat.value}</p>
              )}
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
