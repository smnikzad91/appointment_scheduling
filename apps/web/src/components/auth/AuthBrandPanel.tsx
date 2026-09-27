"use client";

import Link from "next/link";
import MarkWhiteIcon from "@/brand/mark-white.svg";

const signals = [
  {
    label: "حسگر دما • انبار ۱",
    value: "متصل شد",
    note: "warehouse/temp",
    badge: "آنلاین",
    badgeColor: "bg-success-500/20 text-success-300",
    dot: "bg-success-400",
    delay: "0s",
  },
  {
    label: "دروازه IoT • خط تولید",
    value: "پیام منتشر شد",
    note: "factory/gateway-2",
    badge: "زنده",
    badgeColor: "bg-brand-400/20 text-brand-300",
    dot: "bg-brand-400",
    delay: "0.3s",
  },
  {
    label: "کنترلر روشنایی",
    value: "قطع اتصال",
    note: "home/lights",
    badge: "آفلاین",
    badgeColor: "bg-error-500/20 text-error-300",
    dot: "bg-error-400",
    delay: "0.6s",
  },
];

export default function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 h-full flex-col bg-brand-950 overflow-hidden relative">
      {/* subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/60 via-transparent to-brand-950/80 pointer-events-none" />
      {/* dot grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #7592ff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 flex flex-col h-full px-10 py-12">

        {/* logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          style={{ animation: "fade-in-up 0.5s ease both" }}
        >
          <MarkWhiteIcon viewBox="6 12 36 36" className="shrink-0" width={36} height={36} />
          <span className="text-2xl font-extrabold text-white tracking-tight">
            mqttcloud<span className="font-mono font-normal text-[#16b8c9]">.ir</span>
          </span>
        </Link>

        {/* center block */}
        <div className="flex-1 flex flex-col justify-center gap-8">
          <div style={{ animation: "fade-in-up 0.5s ease 0.1s both" }}>
            <h2 className="text-2xl font-bold text-white leading-snug">
              بروکر MQTT<br />امن و بی‌درنگ
            </h2>
            <p className="mt-3 text-sm text-white/50 leading-relaxed max-w-xs">
              دستگاه‌های خود را به بروکر متصل کنید و وضعیت اتصال هرکدام را در لحظه دنبال کنید.
            </p>
          </div>

          {/* signal cards */}
          <div className="space-y-3">
            {signals.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4"
                style={{ animation: `fade-in-up 0.5s ease ${0.2 + i * 0.1}s both` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`}
                      style={{ animation: `pulse-ring 1.8s ease ${s.delay} infinite` }}
                    />
                    <span className="text-xs text-white/40 truncate">{s.label}</span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${s.badgeColor}`}>
                    {s.badge}
                  </span>
                </div>
                <p className="mt-2 text-base font-semibold text-white pr-4">{s.value}</p>
                <p className="mt-0.5 text-xs text-white/40 pr-4">{s.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* stats bar */}
        <div
          className="flex items-center justify-between border-t border-white/10 pt-6"
          style={{ animation: "fade-in-up 0.5s ease 0.55s both" }}
        >
          {[["۹۹.۹٪", "پایداری بروکر"], ["۲۴/۷", "بروکر همیشه فعال"], ["< ۵۰ms", "میانگین تأخیر"]].map(([num, lbl]) => (
            <div key={lbl} className="text-center">
              <p className="text-lg font-bold text-white">{num}</p>
              <p className="text-xs text-white/40 mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
