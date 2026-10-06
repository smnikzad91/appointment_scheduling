import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { AppointmentStatus, BalanceMethod, PayoutMethod, Prisma, WalletTxKind } from "@appointment-scheduling/database";
import { InsufficientWalletError, moveWallet, stylistShareOfPrepayment } from "./prepayment.js";

// The rest of a completed booking's price (after any pre-payment), chosen by the stylist / salon
// when marking it done (owner's rules, 2026-10-05):
//   * ON_SITE — the customer pays them directly (cash / card); nothing moves on the platform;
//   * WALLET  — it's requested from the customer's wallet; the customer approves it in their panel
//     (payBalance). Paid, it's split like the pre-payment: a salon stylist's commission share to their
//     wallet as a WALLET payout, the rest to the owner's.
// Leaving COMPLETED undoes it: an unpaid request is dropped, a paid one refunded to the customer.

/** What's left to pay once the booking is done: the price (or the corrected charge) minus the pre-payment. */
export function balanceDue(a: { priceToman: number; chargedToman?: number | null; prepaidToman: number }): number {
  return Math.max(0, (a.chargedToman ?? a.priceToman) - a.prepaidToman);
}

/** Fields to set when an appointment becomes COMPLETED with the chosen method. */
export function balanceOnCompletion(a: { priceToman: number; prepaidToman: number }, method: BalanceMethod | undefined) {
  const due = balanceDue(a);
  if (due <= 0) return { balanceMethod: null, balanceDueToman: 0 };
  return { balanceMethod: method ?? BalanceMethod.ON_SITE, balanceDueToman: method === BalanceMethod.WALLET ? due : 0 };
}

/** Leaving COMPLETED: drop the request, or give a paid balance back (owner, stylist → customer). */
export async function undoBalance(
  tx: Prisma.TransactionClient,
  a: { id: string; customerId: string; balanceMethod: BalanceMethod | null; balancePaidAt: Date | null; balanceDueToman: number; balanceStylistToman: number; balancePayoutId: string | null },
  ownerId: string,
  stylistUserId: string,
) {
  if (!a.balanceMethod) return;
  const reset = { balanceMethod: null, balanceDueToman: 0, balancePaidAt: null, balanceStylistToman: 0, balancePayoutId: null };
  if (!a.balancePaidAt) {
    await tx.appointment.update({ where: { id: a.id }, data: reset });
    return;
  }
  const claimed = await tx.appointment.updateMany({ where: { id: a.id, balancePaidAt: a.balancePaidAt }, data: reset });
  if (claimed.count !== 1) throw new ConflictException("This appointment just changed — reload and try again");
  const refs = { appointmentId: a.id };
  await moveWallet(tx, ownerId, -(a.balanceDueToman - a.balanceStylistToman), WalletTxKind.BALANCE_INCOME_REVERSAL, refs, true);
  if (a.balanceStylistToman > 0) {
    await moveWallet(tx, stylistUserId, -a.balanceStylistToman, WalletTxKind.BALANCE_INCOME_REVERSAL, refs, true);
    if (a.balancePayoutId) await tx.stylistPayout.deleteMany({ where: { id: a.balancePayoutId } });
  }
  await moveWallet(tx, a.customerId, a.balanceDueToman, WalletTxKind.BALANCE_REFUND, refs);
}

/**
 * The customer pays the requested rest of a completed booking from their wallet. Claimed with a
 * conditional update, so it's paid once; not enough balance → 402 and nothing changes.
 */
export async function payBalance(tx: Prisma.TransactionClient, customerId: string, appointmentId: string, now = new Date()) {
  const a = await tx.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true, customerId: true, salonId: true, stylistId: true, status: true, balanceMethod: true, balanceDueToman: true,
      balancePaidAt: true, stylistCommissionPercent: true,
      salon: { select: { ownerId: true } },
      stylist: { select: { userId: true } },
    },
  });
  if (!a || a.customerId !== customerId) throw new NotFoundException("Appointment not found");
  if (a.status !== AppointmentStatus.COMPLETED || a.balanceMethod !== BalanceMethod.WALLET || a.balanceDueToman <= 0) {
    throw new BadRequestException("Nothing to pay for this appointment");
  }
  if (a.balancePaidAt) throw new ConflictException("Already paid");

  const claimed = await tx.appointment.updateMany({ where: { id: a.id, balancePaidAt: null, balanceMethod: BalanceMethod.WALLET }, data: { balancePaidAt: now } });
  if (claimed.count !== 1) throw new ConflictException("Already paid");

  const due = a.balanceDueToman;
  const refs = { appointmentId: a.id };
  if ((await moveWallet(tx, customerId, -due, WalletTxKind.BALANCE_PAYMENT, refs)) === null) {
    const user = await tx.user.findUnique({ where: { id: customerId }, select: { walletBalance: true } });
    throw new InsufficientWalletError(due, user?.walletBalance ?? 0, "Not enough wallet balance to pay the rest");
  }
  const stylistPart = a.stylist.userId !== a.salon.ownerId ? stylistShareOfPrepayment(due, a.stylistCommissionPercent ?? 0) : 0;
  await moveWallet(tx, a.salon.ownerId, due - stylistPart, WalletTxKind.BALANCE_INCOME, refs);
  let payoutId: string | null = null;
  if (stylistPart > 0) {
    const payout = await tx.stylistPayout.create({
      data: { salonId: a.salonId, stylistId: a.stylistId, amountToman: stylistPart, method: PayoutMethod.WALLET, paidAt: now, note: "سهم باقی‌مانده نوبت (کیف پول مشتری)" },
    });
    payoutId = payout.id;
    await moveWallet(tx, a.stylist.userId, stylistPart, WalletTxKind.BALANCE_INCOME, { ...refs, payoutId });
  }
  await tx.appointment.update({ where: { id: a.id }, data: { balanceStylistToman: stylistPart, balancePayoutId: payoutId } });
  return { paidToman: due, stylistPart, ownerId: a.salon.ownerId, stylistUserId: a.stylist.userId };
}
