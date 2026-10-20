// Query string of GET /api/user/finance/wallet → Prisma filter, order and page. Every parameter is
// optional; with none it's the newest 50 (what the Android app reads). Unknown values fall back to
// the default instead of failing.

export const WALLET_TX_KINDS = [
  "top_up", "prepayment", "prepayment_refund", "prepayment_income", "prepayment_income_reversal",
  "withdrawal", "withdrawal_reversal", "payout_sent", "payout_received", "plan_purchase", "plan_credit",
  "balance_payment", "balance_income", "balance_income_reversal", "balance_refund", "sms_cost",
] as const;
export type WalletTxKindWire = (typeof WALLET_TX_KINDS)[number];

/** in = money into the wallet (amount > 0), out = money out. */
export type WalletDirection = "all" | "in" | "out";
/** credit / debit = by amount, biggest deposit / biggest withdrawal first. */
export type WalletSort = "newest" | "oldest" | "credit" | "debit";
/** Days back from now; "all" = no limit. */
export type WalletPeriod = "all" | "7" | "30" | "90" | "365";

export interface WalletQuery {
  direction: WalletDirection;
  kind: WalletTxKindWire | null;
  period: WalletPeriod;
  sort: WalletSort;
  page: number;
  pageSize: number;
}

export const WALLET_DEFAULT_PAGE_SIZE = 50;
export const WALLET_MAX_PAGE_SIZE = 100;

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

const positiveInt = (value: string | null, fallback: number, max: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
};

export function parseWalletQuery(params: URLSearchParams): WalletQuery {
  return {
    direction: pick(params.get("direction"), ["all", "in", "out"] as const, "all"),
    kind: pick<WalletTxKindWire | "">(params.get("kind"), WALLET_TX_KINDS, "") || null,
    period: pick(params.get("period"), ["all", "7", "30", "90", "365"] as const, "all"),
    sort: pick(params.get("sort"), ["newest", "oldest", "credit", "debit"] as const, "newest"),
    page: positiveInt(params.get("page"), 1, 100_000),
    pageSize: positiveInt(params.get("pageSize"), WALLET_DEFAULT_PAGE_SIZE, WALLET_MAX_PAGE_SIZE),
  };
}

/** The `where` for one user's transactions, without the user (the route adds it). */
export function walletWhere(q: WalletQuery, now = new Date()) {
  return {
    ...(q.direction === "in" ? { amountToman: { gt: 0 } } : q.direction === "out" ? { amountToman: { lt: 0 } } : {}),
    ...(q.kind ? { kind: q.kind.toUpperCase() } : {}),
    ...(q.period !== "all" ? { createdAt: { gte: new Date(now.getTime() - Number(q.period) * 86_400_000) } } : {}),
  };
}

/** Ties (same amount) newest first; `id` last so pages never overlap. */
export function walletOrderBy(sort: WalletSort) {
  switch (sort) {
    case "oldest": return [{ createdAt: "asc" as const }, { id: "asc" as const }];
    case "credit": return [{ amountToman: "desc" as const }, { createdAt: "desc" as const }, { id: "desc" as const }];
    case "debit": return [{ amountToman: "asc" as const }, { createdAt: "desc" as const }, { id: "desc" as const }];
    default: return [{ createdAt: "desc" as const }, { id: "desc" as const }];
  }
}
