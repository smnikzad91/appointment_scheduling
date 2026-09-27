import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="font-vazirmatn bg-white dark:bg-gray-900">
      <ThemeProvider>
        <div className="flex lg:flex-row-reverse h-screen overflow-hidden">

          {/* ── form side ── */}
          <div className="relative flex flex-col flex-1 overflow-x-hidden overflow-y-auto no-scrollbar">
            {/* dot grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
              style={{
                backgroundImage: "radial-gradient(circle, #465fff 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            {/* top-right glow */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-400/15 blur-3xl dark:bg-brand-500/20" />
            {/* bottom-left glow */}
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-brand-300/10 blur-3xl dark:bg-brand-600/15" />

            {/* content */}
            <div className="relative z-10 flex flex-col flex-1">
              {children}
            </div>
          </div>

          {/* ── brand panel ── */}
          <AuthBrandPanel />

          <div className="fixed bottom-6 left-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
