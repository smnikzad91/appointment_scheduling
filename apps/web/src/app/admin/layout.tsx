"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import React from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";

  const mainContentMargin = isMobileOpen
    ? ""
    : isExpanded || isHovered
    ? isRTL ? "lg:mr-[280px]" : "lg:ml-[280px]"
    : isRTL ? "lg:mr-[72px]" : "lg:ml-[72px]";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <div className={`flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}>
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</div>
      </div>
    </div>
  );
}
