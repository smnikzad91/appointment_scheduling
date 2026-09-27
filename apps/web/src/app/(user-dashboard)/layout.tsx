"use client";

import UserSidebar from "@/components/user-dashboard/UserSidebar";
import UserHeader from "@/components/user-dashboard/UserHeader";
import PanelThemeStyle from "@/components/theme/PanelThemeStyle";
import { WalletProvider } from "@/context/WalletContext";
import { useLanguage } from "@/context/LanguageContext";
import React from "react";

function UserDashboardShell({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const isRTL = lang === "fa";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="panel-root-theme min-h-screen bg-gradient-to-br from-white to-brand-50 dark:from-[#0d1117] dark:to-[#1a2744]">
      <PanelThemeStyle />
      <UserHeader />
      <main className="overflow-y-auto pb-20">
        <div className="mx-auto max-w-screen-2xl px-4 py-6">{children}</div>
      </main>
      <UserSidebar />
    </div>
  );
}

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <UserDashboardShell>{children}</UserDashboardShell>
    </WalletProvider>
  );
}
