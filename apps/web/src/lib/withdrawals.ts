import { Prisma } from "@appointment-scheduling/database";
import { prisma } from "@/lib/prisma";
import { moveWallet } from "@/lib/wallet";
import { normalizeSheba } from "@/lib/sheba";

export { normalizeSheba };

// Withdrawals: the amount leaves the balance when requested; the platform admin transfers it to the
// Sheba (Paya/Satna) and marks it paid with the bank's tracking code, or rejects it — rejecting or
// the user cancelling a pending one puts the money back. One pending request per account.

export const MIN_WITHDRAWAL_TOMAN = 50_000;

export class WithdrawalError extends Error {}

export async function requestWithdrawal(userId: string, input: { amountToman: unknown; sheba: unknown; accountHolder: unknown }) {
  const amountToman = Number(input.amountToman);
  if (!Number.isInteger(amountToman) || amountToman < MIN_WITHDRAWAL_TOMAN) {
    throw new WithdrawalError(`حداقل مبلغ برداشت ${MIN_WITHDRAWAL_TOMAN.toLocaleString("fa-IR")} تومان است`);
  }
  const sheba = normalizeSheba(String(input.sheba ?? ""));
  if (!sheba) throw new WithdrawalError("شماره شبا درست نیست (IR و ۲۴ رقم)");
  const accountHolder = String(input.accountHolder ?? "").trim().slice(0, 100);
  if (accountHolder.length < 3) throw new WithdrawalError("نام صاحب حساب را وارد کنید");
  try {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.withdrawalRequest.create({ data: { userId, amountToman, sheba, accountHolder } });
      if ((await moveWallet(tx, userId, -amountToman, "WITHDRAWAL", { withdrawalId: request.id })) === null) {
        throw new WithdrawalError("موجودی کیف پول کافی نیست");
      }
      return request;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new WithdrawalError("یک درخواست برداشت در انتظار دارید");
    throw err;
  }
}

/**
 * Closes a pending request: PAID (money already left the wallet), or REJECTED / CANCELLED (put
 * back). Conditional on PENDING, so a double click or a race decides it once. False = not pending.
 */
export async function closeWithdrawal(
  id: string,
  to: "PAID" | "REJECTED" | "CANCELLED",
  extra: { userId?: string; trackingCode?: string; adminNote?: string } = {},
) {
  return prisma.$transaction(async (tx) => {
    const w = await tx.withdrawalRequest.findUnique({ where: { id } });
    if (!w || (extra.userId && w.userId !== extra.userId)) return false;
    const claimed = await tx.withdrawalRequest.updateMany({
      where: { id, status: "PENDING" },
      data: { status: to, decidedAt: new Date(), trackingCode: extra.trackingCode ?? null, adminNote: extra.adminNote ?? "" },
    });
    if (claimed.count !== 1) return false;
    if (to !== "PAID") await moveWallet(tx, w.userId, w.amountToman, "WITHDRAWAL_REVERSAL", { withdrawalId: id });
    return true;
  });
}

export function withdrawalJson(w: { id: string; amountToman: number; sheba: string; accountHolder: string; status: string; adminNote: string; trackingCode: string | null; createdAt: Date; decidedAt: Date | null }) {
  return { ...w, status: w.status.toLowerCase() };
}
