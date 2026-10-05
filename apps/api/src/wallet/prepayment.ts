import { BadRequestException, ConflictException, HttpException, HttpStatus } from "@nestjs/common";
import { AppointmentStatus, Prisma, PrepaymentStatus, WalletTxKind } from "@appointment-scheduling/database";

// Booking pre-payment, paid only from the customer's wallet (topped up by card-to-card, confirmed
// by the bank SMS — apps/web lib/bankSms). Rules (decided by the platform owner, 2026-10-05):
//   * every online booking pre-pays half its price, taken when it's booked; staff-made bookings
//     (phone, walk-in) don't — the customer isn't there to pay;
//   * any cancellation, by anyone, refunds it in full to the customer's wallet;
//   * COMPLETED or NO_SHOW: it goes to the salon owner's wallet;
//   * a mistaken status tap is undone: leaving COMPLETED/NO_SHOW takes it back from the owner.
// Every wallet change writes a WalletTransaction in the same DB transaction.

export const PREPAYMENT_PERCENT = 50;

export function prepaymentFor(priceToman: number): number {
  return Math.ceil((priceToman * PREPAYMENT_PERCENT) / 100);
}

/** 402 with what the booking needs, so the booking screen can offer a top-up of the difference. */
export class InsufficientWalletError extends HttpException {
  constructor(prepaymentToman: number, balanceToman: number) {
    super(
      { statusCode: HttpStatus.PAYMENT_REQUIRED, message: "Not enough wallet balance for the pre-payment", prepaymentToman, balanceToman },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

/**
 * Adds `amountToman` (negative = takes it) to a wallet and records it. A debit that would go below
 * zero is refused (returns null) unless `allowNegative` — used only to take back income the owner
 * was credited by mistake, which must always succeed.
 */
export async function moveWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  amountToman: number,
  kind: WalletTxKind,
  appointmentId: string | null,
  allowNegative = false,
): Promise<number | null> {
  const guard = amountToman < 0 && !allowNegative ? Prisma.sql`AND "walletBalance" >= ${-amountToman}` : Prisma.empty;
  const rows = await tx.$queryRaw<{ walletBalance: number }[]>`
    UPDATE users SET "walletBalance" = "walletBalance" + ${amountToman}, "updatedAt" = now()
    WHERE id = ${userId} ${guard} RETURNING "walletBalance"`;
  if (rows.length === 0) return null;
  await tx.walletTransaction.create({ data: { userId, kind, amountToman, balanceAfter: rows[0].walletBalance, appointmentId } });
  return rows[0].walletBalance;
}

/** Takes the pre-payment for a new online booking (inside the booking's transaction). */
export async function takePrepayment(tx: Prisma.TransactionClient, customerId: string, appointmentId: string, amountToman: number) {
  if (amountToman <= 0) return;
  const after = await moveWallet(tx, customerId, -amountToman, WalletTxKind.PREPAYMENT, appointmentId);
  if (after === null) {
    const user = await tx.user.findUnique({ where: { id: customerId }, select: { walletBalance: true } });
    throw new InsufficientWalletError(amountToman, user?.walletBalance ?? 0);
  }
}

export function prepaymentStateFor(status: AppointmentStatus): PrepaymentStatus {
  if (status === AppointmentStatus.CANCELLED) return PrepaymentStatus.REFUNDED;
  if (status === AppointmentStatus.COMPLETED || status === AppointmentStatus.NO_SHOW) return PrepaymentStatus.SETTLED;
  return PrepaymentStatus.HELD;
}

/**
 * Moves a booking's pre-payment to where its new status says it belongs (inside the status
 * update's transaction). The appointment's prepaymentStatus is switched with a conditional update
 * first, so two status changes racing each other can't both move the money.
 */
export async function applyPrepayment(
  tx: Prisma.TransactionClient,
  appointment: { id: string; customerId: string; prepaidToman: number; prepaymentStatus: PrepaymentStatus | null; ownerId: string },
  next: AppointmentStatus,
) {
  const from = appointment.prepaymentStatus;
  if (!from || appointment.prepaidToman <= 0) return;
  const to = prepaymentStateFor(next);
  if (to === from) return;
  // Refunded means the customer already has it back; reopening would need taking it again.
  if (from === PrepaymentStatus.REFUNDED) throw new BadRequestException("A cancelled prepaid booking can't be reopened");

  const switched = await tx.appointment.updateMany({ where: { id: appointment.id, prepaymentStatus: from }, data: { prepaymentStatus: to } });
  if (switched.count !== 1) throw new ConflictException("This appointment just changed — reload and try again");

  const amount = appointment.prepaidToman;
  if (from === PrepaymentStatus.SETTLED) {
    await moveWallet(tx, appointment.ownerId, -amount, WalletTxKind.PREPAYMENT_INCOME_REVERSAL, appointment.id, true);
  }
  if (to === PrepaymentStatus.SETTLED) {
    await moveWallet(tx, appointment.ownerId, amount, WalletTxKind.PREPAYMENT_INCOME, appointment.id);
  } else if (to === PrepaymentStatus.REFUNDED) {
    await moveWallet(tx, appointment.customerId, amount, WalletTxKind.PREPAYMENT_REFUND, appointment.id);
  }
}
