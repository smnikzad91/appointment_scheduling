import { salonApiFetch } from "./salonApiClient";

export interface WalletInfo {
  balanceToman: number;
  /** Share of an online booking's price paid in advance from the wallet (apps/api wallet/prepayment.ts). */
  prepaymentPercent: number;
}

/** The signed-in customer's wallet balance, read with their apps/api token (booking sheet, app). */
export function getWallet(accessToken: string): Promise<WalletInfo> {
  return salonApiFetch("/wallet/me", { headers: { Authorization: `Bearer ${accessToken}` } });
}

export function prepaymentOf(priceToman: number, percent: number): number {
  return Math.ceil((priceToman * percent) / 100);
}
