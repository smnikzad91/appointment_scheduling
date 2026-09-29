import { salonApiFetch } from "./salonApiClient";

// Salon & stylist bookkeeping (apps/api src/accounting). Income is booked per COMPLETED appointment
// with the stylist's commission frozen at that moment; payouts settle what stylists are owed;
// expenses are the salon's running costs. Periods are [from, to) instants (see lib/accountingPeriod).

export type PayoutMethod = "CASH" | "CARD_TO_CARD" | "BANK_TRANSFER" | "OTHER";
export type ExpenseCategory = "RENT" | "SUPPLIES" | "SALARIES" | "UTILITIES" | "EQUIPMENT" | "MARKETING" | "OTHER";

export const PAYOUT_METHOD_LABEL: Record<PayoutMethod, string> = {
  CASH: "نقدی",
  CARD_TO_CARD: "کارت به کارت",
  BANK_TRANSFER: "واریز بانکی",
  OTHER: "سایر",
};

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  RENT: "اجاره",
  SUPPLIES: "مواد و لوازم مصرفی",
  SALARIES: "حقوق پرسنل",
  UTILITIES: "قبوض و شارژ",
  EQUIPMENT: "تجهیزات",
  MARKETING: "تبلیغات",
  OTHER: "سایر",
};

export interface Period {
  from: string;
  to: string;
}

export interface IncomeItem {
  id: string;
  startAt: string;
  customerName: string;
  stylist: { id: string; displayName: string };
  services: string[];
  priceToman: number;
  /** What was paid for the services (excluding any tip). */
  chargedToman: number;
  /** Tip for the stylist on top (0 = none); all theirs. */
  tipToman: number;
  /** Effective percent — may be fractional when some services have their own rate. */
  commissionPercent: number;
  /** Commission + tip. */
  stylistShareToman: number;
  /** chargedToman − commission (never includes a tip). */
  salonShareToman: number;
}

export interface StylistAccount {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  active: boolean;
  commissionPercent: number;
  appointmentCount: number;
  /** Including tips. */
  incomeToman: number;
  tipsToman: number;
  shareToman: number;
  paidInPeriodToman: number;
  /** All-time: commission earned minus payouts. Negative = paid in advance. */
  balanceToman: number;
}

export interface SalonSummary {
  totals: {
    appointmentCount: number;
    /** Including tips. */
    incomeToman: number;
    tipsToman: number;
    stylistShareToman: number;
    salonShareToman: number;
    expensesToman: number;
    netProfitToman: number;
    payoutsToman: number;
    owedToStylistsToman: number;
  };
  stylists: StylistAccount[];
  services: { serviceId: string; name: string; count: number; bookedToman: number }[];
  expensesByCategory: { category: ExpenseCategory; amountToman: number }[];
}

export interface Payout {
  id: string;
  stylistId: string;
  amountToman: number;
  method: PayoutMethod;
  paidAt: string;
  note: string | null;
  stylist?: { id: string; displayName: string };
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amountToman: number;
  spentAt: string;
  note: string | null;
  /** Optional private receipt photo (only the owner can open it). */
  receiptUrl: string | null;
}

export interface StylistEarnings {
  stylist: { id: string; displayName: string; commissionPercent: number };
  totals: {
    appointmentCount: number;
    incomeToman: number;
    tipsToman: number;
    shareToman: number;
    paidInPeriodToman: number;
    /** The stylist's own expenses logged in the period. */
    expensesToman: number;
    /** shareToman − expensesToman; may be negative (a loss). */
    netIncomeToman: number;
  };
  balanceToman: number;
  items: IncomeItem[];
  payouts: Payout[];
  expenses: StylistExpense[];
}

// The stylist's own work costs, logged on /stylist/expenses; they lower the stylist's net income
// but never the salon's books or balance.
export type StylistExpenseCategory = "SUPPLIES" | "PRODUCTS" | "TOOLS" | "TRAINING" | "TRANSPORT" | "OTHER";

export const STYLIST_EXPENSE_CATEGORY_LABEL: Record<StylistExpenseCategory, string> = {
  SUPPLIES: "مواد مصرفی",
  PRODUCTS: "خرید محصول",
  TOOLS: "ابزار و تعمیرات",
  TRAINING: "آموزش",
  TRANSPORT: "رفت‌وآمد",
  OTHER: "سایر",
};

export interface StylistExpense {
  id: string;
  category: StylistExpenseCategory;
  amountToman: number;
  spentAt: string;
  description: string;
  receiptUrl: string | null;
}

export interface StylistExpensePage {
  items: StylistExpense[];
  /** Matching expenses in the period (all pages). */
  total: number;
  totalToman: number;
  page: number;
  pageSize: number;
}

export type StylistExpenseInput = {
  category: StylistExpenseCategory;
  amountToman: number;
  spentAt: string;
  description: string;
  receiptUrl: string | null;
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const qs = (params: Record<string, string | undefined>) =>
  new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString();

export function getSalonSummary(token: string, p: Period) {
  return salonApiFetch<SalonSummary>(`/salons/mine/accounting?${qs({ ...p })}`, { headers: auth(token) });
}

export function listIncome(token: string, p: Period, stylistId?: string) {
  return salonApiFetch<IncomeItem[]>(`/salons/mine/accounting/income?${qs({ ...p, stylistId })}`, { headers: auth(token) });
}

export function adjustCharge(token: string, appointmentId: string, chargedToman: number, tipToman: number) {
  return salonApiFetch<IncomeItem>(`/salons/mine/accounting/appointments/${appointmentId}/charge`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ chargedToman, tipToman }),
  });
}

export function listPayouts(token: string, params: { stylistId?: string } & Partial<Period> = {}) {
  return salonApiFetch<Payout[]>(`/salons/mine/payouts?${qs(params)}`, { headers: auth(token) });
}

export function createPayout(token: string, data: { stylistId: string; amountToman: number; method: PayoutMethod; paidAt?: string; note?: string }) {
  return salonApiFetch<Payout>("/salons/mine/payouts", { method: "POST", headers: auth(token), body: JSON.stringify(data) });
}

export function deletePayout(token: string, id: string) {
  return salonApiFetch<{ ok: true }>(`/salons/mine/payouts/${id}`, { method: "DELETE", headers: auth(token) });
}

export function listExpenses(token: string, p: Period) {
  return salonApiFetch<Expense[]>(`/salons/mine/expenses?${qs({ ...p })}`, { headers: auth(token) });
}

export function createExpense(token: string, data: { category: ExpenseCategory; amountToman: number; spentAt?: string; note?: string; receiptUrl?: string | null }) {
  return salonApiFetch<Expense>("/salons/mine/expenses", { method: "POST", headers: auth(token), body: JSON.stringify(data) });
}

export function updateExpense(token: string, id: string, data: Partial<{ category: ExpenseCategory; amountToman: number; spentAt: string; note: string | null; receiptUrl: string | null }>) {
  return salonApiFetch<Expense>(`/salons/mine/expenses/${id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(data) });
}

export function deleteExpense(token: string, id: string) {
  return salonApiFetch<{ ok: true }>(`/salons/mine/expenses/${id}`, { method: "DELETE", headers: auth(token) });
}

export function getMyEarnings(token: string, p: Period) {
  return salonApiFetch<StylistEarnings>(`/stylists/me/earnings?${qs({ ...p })}`, { headers: auth(token) });
}

export function listMyExpenses(token: string, p: Period, opts: { category?: StylistExpenseCategory; page?: number; pageSize?: number } = {}) {
  return salonApiFetch<StylistExpensePage>(
    `/stylists/me/expenses?${qs({ ...p, category: opts.category, page: opts.page?.toString(), pageSize: opts.pageSize?.toString() })}`,
    { headers: auth(token) },
  );
}

export function createMyExpense(token: string, data: StylistExpenseInput) {
  return salonApiFetch<StylistExpense>("/stylists/me/expenses", { method: "POST", headers: auth(token), body: JSON.stringify(data) });
}

export function updateMyExpense(token: string, id: string, data: Partial<StylistExpenseInput>) {
  return salonApiFetch<StylistExpense>(`/stylists/me/expenses/${id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(data) });
}

export function deleteMyExpense(token: string, id: string) {
  return salonApiFetch<{ ok: true }>(`/stylists/me/expenses/${id}`, { method: "DELETE", headers: auth(token) });
}
