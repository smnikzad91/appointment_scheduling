"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import { useWallet } from "@/context/WalletContext";
import { useEffect, useState } from "react";

export default function UserDashboardPage() {
  const t = useT();
  const { lang } = useLanguage();
  const { data: session } = useSession();
  const userName  = session?.user?.name  ?? "";
  const userEmail = session?.user?.email ?? "";
  const avatar    = session?.user?.avatar || "/images/user/user-01.jpg";
  const firstName = userName.split(" ")[0];
  const sep = lang === "fa" ? " " : ", ";

  const rawCreatedAt = session?.user?.createdAt ?? "";
  const memberSince = rawCreatedAt
    ? new Date(rawCreatedAt).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", {
        year: "numeric", month: "long",
      })
    : "";

  const { balance: walletBalance } = useWallet();
  const [phone, setPhone] = useState("");
  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/user/profile")
        .then((r) => r.json())
        .then((d) => { if (d.phone) setPhone(d.phone); })
        .catch(() => {});
    });
  }, []);

  const quickLinks = [
    { href: "/dashboard/profile",      title: t("editProfile"),        desc: t("editProfileDesc") },
    { href: "/dashboard/account",      title: t("accountSettings"),    desc: t("accountSettingsDesc") },
    { href: "/dashboard/subscription", title: t("manageSubscription"), desc: t("manageSubscriptionDesc") },
    { href: "/pricing",                title: t("comparePlans"),       desc: t("comparePlansDesc") },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("welcomeBack")}{firstName ? `${sep}${firstName}` : ""} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("accountSummary")}
        </p>
      </div>

      {/* Wallet balance */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21Z" fill="currentColor" />
                <path d="M21 8H12V16H21V8ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="currentColor" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("walletBalanceLabel")}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {walletBalance === null
                  ? "—"
                  : walletBalance.toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}
                <span className="ms-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("walletUnit")}
                </span>
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/wallet"
            className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-400 dark:hover:bg-brand-500/10 transition-colors"
          >
            {t("topUp")}
          </Link>
        </div>
      </div>

      {/* Plan card */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 dark:border-brand-800 dark:bg-brand-500/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              {t("currentPlan")}
            </span>
            <h2 className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {t("planFree")}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("planFreeDesc")}
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors shadow-md shadow-brand-500/25"
          >
            {t("upgradeToPro")}
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          {t("quickActions")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-brand-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-700"
            >
              <p className="font-medium text-gray-800 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 transition-colors">
                {item.title}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {item.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Profile preview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t("yourProfile")}
          </h2>
          <Link
            href="/dashboard/profile"
            className="text-sm font-medium text-brand-500 hover:underline"
          >
            {t("edit")}
          </Link>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-brand-100 dark:ring-brand-900">
            <Image
              src={avatar}
              alt={userName || "Avatar"}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-white">{userName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</p>
            {phone && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{phone}</p>
            )}
            {memberSince && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {t("memberSince")} {memberSince}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
