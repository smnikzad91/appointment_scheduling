"use client";

import Link from "next/link";
import { useT } from "@/i18n/useT";

export default function SubscriptionPage() {
  const t = useT();

  const features = [
    t("feature1"),
    t("feature2"),
    t("feature3"),
    t("feature4"),
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("subscriptionTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("subscriptionDesc")}
        </p>
      </div>

      {/* Current plan */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">
              {t("currentPlan")}
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("planFree")}
              </span>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {t("planActive")}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("planPrice")}
            </p>
          </div>
          <Link
            href="/pricing"
            className="inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            {t("upgradePlan")}
          </Link>
        </div>

        <hr className="my-6 border-gray-100 dark:border-gray-800" />

        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          {t("includedInPlan")}
        </h3>
        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg className="h-4 w-4 shrink-0 text-brand-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Billing history placeholder */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
          {t("billingHistory")}
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {t("noInvoices")}
        </p>
      </div>
    </div>
  );
}
