// POST /api/admin/users/:id/wallet body → a signed amount and the reason (shown to the user in their
// wallet history). Pure, so node --test runs walletAdjustment.test.ts directly.

/** Ten billion rial: far above any real correction, catches an extra zero or two. */
export const MAX_ADJUSTMENT_TOMAN = 100_000_000;
export const MAX_ADJUSTMENT_NOTE = 200;

export type AdjustmentError = "Invalid amount" | "Amount too large" | "A reason is required" | "Reason too long";

const DIGITS: Record<string, string> = { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9", "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };

/** «۱۲٬۰۰۰», "12,000", 12000 → 12000; anything else → NaN. */
export function parseToman(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const plain = value.replace(/[۰-۹٠-٩]/g, (d) => DIGITS[d]).replace(/[,٬،\s]/g, "");
  return /^\d+$/.test(plain) ? Number(plain) : NaN;
}

export function parseAdjustment(body: unknown): { amountToman: number; note: string; notify: boolean } | { error: AdjustmentError } {
  const b = (body ?? {}) as { direction?: unknown; amountToman?: unknown; note?: unknown; notify?: unknown };
  const amount = parseToman(b.amountToman);
  if (b.direction !== "credit" && b.direction !== "debit") return { error: "Invalid amount" };
  if (!Number.isSafeInteger(amount) || amount < 1) return { error: "Invalid amount" };
  if (amount > MAX_ADJUSTMENT_TOMAN) return { error: "Amount too large" };
  const note = typeof b.note === "string" ? b.note.trim().replace(/\s+/g, " ") : "";
  if (!note) return { error: "A reason is required" };
  if (note.length > MAX_ADJUSTMENT_NOTE) return { error: "Reason too long" };
  // SMS to the user unless the admin turns it off (`notify: false`)
  return { amountToman: b.direction === "debit" ? -amount : amount, note, notify: b.notify !== false };
}

const faMoney = (n: number) =>
  Math.round(n).toLocaleString("en-US").replace(/,/g, "٬").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/**
 * The user's SMS after a manual change, one segment. A credit reads like an automatic top-up's
 * (apps/api topUpPaidText): «کیف پول نوبتت ۵۰۰٬۰۰۰ تومان شارژ شد\nموجودی: ۶۲۰٬۰۰۰ تومان»; a debit
 * «از کیف پول نوبتت ۵۰٬۰۰۰ تومان کسر شد\nموجودی: …». The reason stays in the wallet history.
 */
export function adjustmentSmsText(amountToman: number, balanceToman: number): string {
  const balance = `موجودی: ${faMoney(balanceToman)} تومان`;
  return amountToman > 0
    ? `کیف پول نوبتت ${faMoney(amountToman)} تومان شارژ شد\n${balance}`
    : `از کیف پول نوبتت ${faMoney(-amountToman)} تومان کسر شد\n${balance}`;
}
