"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import {
  MegaphoneIcon,
  FaqIcon,
  EnvelopeIcon,
  ShieldIcon,
  BoxCubeIcon,
  ChatIcon,
  ChevronDownIcon,
  DocsIcon,
  DollarLineIcon,
  GridIcon,
  GroupIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PlugInIcon,
  UserCircleIcon,
  ShootingStarIcon,
} from "../icons/index";
import MarkIcon from "@/brand/mark.svg";
import MarkWhiteIcon from "@/brand/mark-white.svg";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const expanded = isExpanded || isHovered || isMobileOpen;
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";

  const navItems = useMemo<NavItem[]>(() => [
    { icon: <GridIcon />,       name: t("navDashboard"),    path: "/admin" },
    { icon: <UserCircleIcon />, name: t("navUserProfile"),  path: "/admin/profile" },
    { icon: <GroupIcon />,      name: t("navUsers"),        path: "/admin/users" },
    { icon: <ListIcon />,       name: t("navSalons"),       path: "/admin/salons" },
    { icon: <ShootingStarIcon />, name: t("navHomepage"),   path: "/admin/homepage" },
    { icon: <BoxCubeIcon />,    name: t("navPricing"),      path: "/admin/pricing" },
    { icon: <PlugInIcon />,     name: t("navSocialLinks"),    path: "/admin/social-links" },
    { icon: <MegaphoneIcon />,  name: t("navAnnouncements"),  path: "/admin/announcements" },
    { icon: <FaqIcon />,        name: t("navFaq"),             path: "/admin/faqs" },
    { icon: <EnvelopeIcon />,  name: t("navContact"),         path: "/admin/contact" },
    { icon: <ShieldIcon />,    name: t("navLegal"),           path: "/admin/legal" },
    { icon: <PageIcon />,      name: t("navSeoSettings"),     path: "/admin/seo-settings" },
    { icon: <ChatIcon />,       name: t("navTickets"),      path: "/admin/tickets" },
    { icon: <DollarLineIcon />, name: t("navFinance"),      path: "/admin/finance" },
    {
      icon: <DocsIcon />,
      name: t("navBlog"),
      subItems: [
        { name: t("navBlogPosts"),      path: "/admin/blog" },
        { name: t("navBlogNewPost"),    path: "/admin/blog/new" },
        { name: t("navBlogCategories"), path: "/admin/blog/categories" },
        { name: t("navBlogPublic"),     path: "/blog" },
      ],
    },
    {
      icon: <PageIcon />,
      name: t("navNews"),
      subItems: [
        { name: t("navNewsItems"),  path: "/admin/news" },
        { name: t("navNewsNew"),    path: "/admin/news/new" },
        { name: t("navNewsTags"),   path: "/admin/news/tags" },
        { name: t("navNewsPublic"), path: "/news" },
      ],
    },
  ], [t]);

  const [openSubmenu, setOpenSubmenu] = useState<{ type: "main"; index: number } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  useEffect(() => {
    queueMicrotask(() => {
      let matched = false;
      navItems.forEach((nav, index) => {
        nav.subItems?.forEach((sub) => {
          if (isActive(sub.path)) {
            setOpenSubmenu({ type: "main", index });
            matched = true;
          }
        });
      });
      if (!matched) setOpenSubmenu(null);
    });
  }, [pathname, isActive, navItems]);

  useEffect(() => {
    if (openSubmenu) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main") => {
    setOpenSubmenu((prev) =>
      prev?.type === menuType && prev?.index === index ? null : { type: menuType, index }
    );
  };

  const renderMenuItems = (items: NavItem[], menuType: "main") => (
    <ul className="flex flex-col gap-1">
      {items.map((nav, index) => {
        const isOpen = openSubmenu?.type === menuType && openSubmenu?.index === index;
        const isItemActive = nav.path ? isActive(nav.path) : nav.subItems?.some((s) => isActive(s.path));

        return (
          <li key={nav.name}>
            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index, menuType)}
                className={`menu-item group w-full ${isItemActive ? "menu-item-active" : "menu-item-inactive"} ${!expanded ? "lg:justify-center" : ""}`}
              >
                {/* active indicator bar */}
                {isItemActive && (
                  <span className={`absolute top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-brand-500 dark:bg-brand-400 ${isRTL ? "right-0" : "left-0"}`} />
                )}
                {/* icon */}
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                  isItemActive
                    ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                    : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700 dark:bg-white/5 dark:text-gray-400 dark:group-hover:bg-white/10"
                } ${isRTL ? "scale-x-[-1]" : ""}`}>
                  {nav.icon}
                </span>
                {expanded && (
                  <>
                    <span className="flex-1 text-start">{nav.name}</span>
                    <ChevronDownIcon
                      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-brand-500" : "text-gray-400"
                      } ${isRTL ? "scale-x-[-1]" : ""}`}
                    />
                  </>
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`menu-item group ${isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"} ${!expanded ? "lg:justify-center" : ""}`}
                >
                  {isActive(nav.path) && (
                    <span className={`absolute top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-brand-500 dark:bg-brand-400 ${isRTL ? "right-0" : "left-0"}`} />
                  )}
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
                    isActive(nav.path)
                      ? "bg-brand-500 text-white shadow-sm shadow-brand-500/30"
                      : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700 dark:bg-white/5 dark:text-gray-400 dark:group-hover:bg-white/10"
                  } ${isRTL ? "scale-x-[-1]" : ""}`}>
                    {nav.icon}
                  </span>
                  {expanded && <span className="flex-1 text-start">{nav.name}</span>}
                </Link>
              )
            )}

            {/* submenu */}
            {nav.subItems && expanded && (
              <div
                ref={(el) => { subMenuRefs.current[`${menuType}-${index}`] = el; }}
                className="overflow-hidden transition-all duration-300"
                style={{ height: isOpen ? `${subMenuHeight[`${menuType}-${index}`]}px` : "0px" }}
              >
                <ul className={`mt-1 space-y-0.5 pb-1 ${isRTL ? "pl-4" : "pr-4"}`}>
                  {nav.subItems.map((sub) => (
                    <li key={sub.name}>
                      <Link
                        href={sub.path}
                        className={`menu-dropdown-item ${isActive(sub.path) ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full transition-all ${
                          isActive(sub.path) ? "bg-brand-500 scale-125" : "bg-gray-300 dark:bg-gray-600"
                        }`} />
                        {sub.name}
                        {(sub.new || sub.pro) && (
                          <span className={`mr-auto menu-dropdown-badge ${isActive(sub.path) ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"}`}>
                            {sub.new ? "new" : "pro"}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      dir={isRTL ? "rtl" : "ltr"}
      className={`fixed top-0 z-50 flex h-screen flex-col bg-white transition-all duration-300 ease-in-out dark:bg-gray-900
        ${isRTL
          ? "right-0 border-l border-gray-200 dark:border-gray-800"
          : "left-0 border-r border-gray-200 dark:border-gray-800"}
        ${expanded ? "w-[280px]" : "w-[72px]"}
        ${isMobileOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"}
        lg:translate-x-0 lg:mt-0 mt-16`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={`flex h-16 shrink-0 items-center border-b border-gray-100 px-4 dark:border-gray-800 ${expanded ? "justify-start gap-2.5" : "justify-center"}`}>
        <MarkIcon viewBox="6 12 36 36" className="shrink-0 dark:hidden" width={36} height={36} />
        <MarkWhiteIcon viewBox="6 12 36 36" className="shrink-0 hidden dark:block" width={36} height={36} />
        {expanded && (
          <Link href="/admin" className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
            نوبتا
          </Link>
        )}
      </div>

      {/* Nav */}
      <div className="flex flex-col overflow-y-auto no-scrollbar flex-1 py-5 px-3">
        <nav className="flex flex-col gap-6">

          {/* Main */}
          <div>
            <h2 className={`mb-3 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 ${!expanded ? "lg:justify-center" : ""}`}>
              {expanded ? t("sidebarMenu") : <HorizontaLDots />}
            </h2>
            {renderMenuItems(navItems, "main")}
          </div>

        </nav>

      </div>
    </aside>
  );
};

export default AppSidebar;
