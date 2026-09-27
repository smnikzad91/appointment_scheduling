"use client";

import { normalizeDigits, toPersianDigits } from "@/lib/persian";
import { TextInput } from "./ui";

function group(n: number) {
  return toPersianDigits(n.toLocaleString("en-US").replace(/,/g, "٬"));
}

/**
 * Toman amount input: numeric keypad, Persian digits with thousands separators as you type,
 * "تومان" suffix. `value` is a whole number of toman, or null when empty.
 */
export default function MoneyInput({
  value,
  onChange,
  placeholder = "۰",
  ...rest
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="relative">
      <TextInput
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        className="pl-16 text-start font-bold"
        placeholder={placeholder}
        value={value === null ? "" : group(value)}
        onChange={(e) => {
          const digits = normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 10);
          onChange(digits ? Number(digits) : null);
        }}
        {...rest}
      />
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-medium text-app-muted">تومان</span>
    </div>
  );
}
