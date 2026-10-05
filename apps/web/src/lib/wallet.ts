import { Prisma } from "@appointment-scheduling/database";

// Same rule as apps/api src/wallet/prepayment.ts moveWallet: every User.walletBalance change goes
// through here inside the caller's transaction and writes its WalletTransaction.

type WalletTxKind = Prisma.WalletTransactionUncheckedCreateInput["kind"];

/** Adds amountToman (negative = takes it); a debit below zero is refused (null). */
export async function moveWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  amountToman: number,
  kind: WalletTxKind,
  refs: { withdrawalId?: string; topUpId?: string } = {},
): Promise<number | null> {
  const guard = amountToman < 0 ? Prisma.sql`AND "walletBalance" >= ${-amountToman}` : Prisma.empty;
  const rows = await tx.$queryRaw<{ walletBalance: number }[]>`
    UPDATE users SET "walletBalance" = "walletBalance" + ${amountToman}, "updatedAt" = now()
    WHERE id = ${userId} ${guard} RETURNING "walletBalance"`;
  if (rows.length === 0) return null;
  await tx.walletTransaction.create({ data: { userId, kind, amountToman, balanceAfter: rows[0].walletBalance, ...refs } });
  return rows[0].walletBalance;
}
