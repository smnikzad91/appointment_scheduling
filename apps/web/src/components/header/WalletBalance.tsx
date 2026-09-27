"use client";
import { useT } from "@/i18n/useT";
import { useWallet } from "@/context/WalletContext";

export default function WalletBalance() {
  const t = useT();
  const { balance } = useWallet();

  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-800 dark:bg-white/[0.03]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21Z" fill="currentColor" />
          <path d="M21 8H12V16H21V8ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="currentColor" />
        </svg>
      </span>
      <div className="hidden sm:block">
        <p className="text-xs leading-none text-gray-500 dark:text-gray-400 mb-0.5">
          {t("walletBalance")}
        </p>
        <p className="text-sm font-semibold leading-none text-gray-800 dark:text-white/90">
          {balance === null
            ? "—"
            : balance.toLocaleString("en-US") + " IRT"}
        </p>
      </div>
    </div>
  );
}
