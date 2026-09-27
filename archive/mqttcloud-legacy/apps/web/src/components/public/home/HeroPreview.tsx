"use client";

import { useRef } from "react";
import type { MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Camera, Lightbulb, Router, Thermometer, Wifi, WifiOff } from "lucide-react";
import { Reveal } from "@/components/public/shared/Reveal";
import { useReducedMotionSafe } from "@/components/public/shared/motion";

const rows = [
  { name: "حسگر دما — انبار ۱", channel: "sensor" as const, detail: "warehouse/temp", online: true },
  { name: "دوربین امنیتی — ورودی", channel: "camera" as const, detail: "security/cam-1", online: true },
  { name: "کنترلر روشنایی", channel: "light" as const, detail: "home/lights", online: false },
  { name: "دروازه IoT — خط تولید", channel: "gateway" as const, detail: "factory/gateway-2", online: true },
];

const channelIcon = { sensor: Thermometer, camera: Camera, light: Lightbulb, gateway: Router };

export function HeroPreview({ forceMotion = false }: { forceMotion?: boolean }) {
  const reduceMotionPreferred = useReducedMotionSafe();
  const reduceMotion = forceMotion ? false : reduceMotionPreferred;
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 220, damping: 22 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 220, damping: 22 });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (reduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <Reveal delay={0.15} forceMotion={forceMotion} className="relative mx-auto w-full max-w-md [perspective:1200px]">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX: reduceMotion ? 0 : rotateX, rotateY: reduceMotion ? 0 : rotateY }}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl transition-shadow duration-300 hover:shadow-2xl dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="h-1 bg-gradient-to-r from-brand-500 via-theme-purple-500 to-brand-500" />
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success-500" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">فعالیت لحظه‌ای اتصال</span>
          </div>
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">اکنون</span>
        </div>

        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => {
            const Icon = channelIcon[row.channel];
            return (
              <li key={row.name} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{row.name}</p>
                  <p dir="ltr" className="truncate text-end text-xs text-gray-500 dark:text-gray-400">{row.detail}</p>
                </div>
                {row.online ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-success-50 px-2 py-1 text-xs font-semibold text-success-600 dark:bg-success-500/10 dark:text-success-400">
                    <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
                    آنلاین
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
                    آفلاین
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gradient-to-r from-brand-50 to-theme-purple-500/5 px-5 py-3.5 dark:border-gray-800 dark:from-brand-500/10 dark:to-theme-purple-500/5">
          <span className="text-xs text-gray-500 dark:text-gray-400">پایداری بروکر امروز</span>
          <span className="bg-gradient-to-r from-brand-600 to-theme-purple-500 bg-clip-text text-sm font-extrabold text-transparent dark:from-brand-400 dark:to-theme-purple-500">۹۹.۹٪</span>
        </div>
      </motion.div>
    </Reveal>
  );
}
