import { BadRequestException, ConflictException, HttpException, HttpStatus } from "@nestjs/common";
import { AppointmentStatus, PayoutMethod, Prisma, PrepaymentStatus, WalletTxKind } from "@appointment-scheduling/database";

// Booking pre-payment, paid only from the customer's wallet (topped up by card-to-card, confirmed
// by the bank SMS — apps/web lib/bankSms). Rules (decided by the platform owner, 2026-10-05):
//   * every online booking pre-pays half its price, taken when it's booked; staff-made bookings
//     (phone, walk-in) don't — the customer isn't there to pay;
//   * any cancellation, by anyone, refunds it in full to the customer's wallet;
//   * COMPLETED: it goes to the salon owner's wallet, except a salon stylist's commission share of
//     it, which goes to the stylist's wallet and is recorded as a WALLET payout to them (so their
//     balance with the salon drops by it); NO_SHOW: all of it to the owner (no service was done);
//   * a mistaken status tap is undone: leaving COMPLETED/NO_SHOW takes it back from the owner.
// Every wallet change writes a WalletTransaction in the same DB transaction.

export const PREPAYMENT_PERCENT = 50;

export function prepaymentFor(priceToman: number): number {
  return Math.ceil((priceToman * PREPAYMENT_PERCENT) / 100);
}

/** 402 with what the booking needs, so the booking screen can offer a top-up of the difference. */
export class InsufficientWalletError extends HttpException {
  constructor(prepaymentToman: number, balanceToman: number, message = "Not enough wallet balance for the pre-payment") {
    super(
      { statusCode: HttpStatus.PAYMENT_REQUIRED, message, prepaymentToman, balanceToman },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

/**
 * Adds `amountToman` (negative = takes it) to a wallet and records it. A debit that would go below
 * zero is refused (returns null) unless `allowNegative` — used only to take back income the owner
 * was credited by mistake, which must always succeed.
 */
export interface WalletRefs {
  appointmentId?: string;
  payoutId?: string;
  planPurchaseId?: string;
  note?: string;
}

export async function moveWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  amountToman: number,
  kind: WalletTxKind,
  refs: WalletRefs = {},
  allowNegative = false,
): Promise<number | null> {
  const guard = amountToman < 0 && !allowNegative ? Prisma.sql`AND "walletBalance" >= ${-amountToman}` : Prisma.empty;
  const rows = await tx.$queryRaw<{ walletBalance: number }[]>`
    UPDATE users SET "walletBalance" = "walletBalance" + ${amountToman}, "updatedAt" = now()
    WHERE id = ${userId} ${guard} RETURNING "walletBalance"`;
  if (rows.length === 0) return null;
  await tx.walletTransaction.create({ data: { userId, kind, amountToman, balanceAfter: rows[0].walletBalance, ...refs } });
  return rows[0].walletBalance;
}

/** Takes the pre-payment for a new online booking (inside the booking's transaction). */
export async function takePrepayment(tx: Prisma.TransactionClient, customerId: string, appointmentId: string, amountToman: number) {
  if (amountToman <= 0) return;
  const after = await moveWallet(tx, customerId, -amountToman, WalletTxKind.PREPAYMENT, { appointmentId });
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
 * Staff changed an open prepaid booking's services and the price went down: the pre-payment must
 * not stay above half the new price, so the excess goes back to the customer's wallet (inside the
 * edit's transaction). A higher price takes nothing more — the customer didn't agree to it; they
 * pay the rest on site. Conditional on the stored amount, so two edits can't both refund it.
 */
export async function refundExcessPrepayment(
  tx: Prisma.TransactionClient,
  a: { id: string; customerId: string; prepaidToman: number; prepaymentStatus: PrepaymentStatus | null },
  newPriceToman: number,
) {
  if (a.prepaymentStatus !== PrepaymentStatus.HELD) return 0;
  const target = Math.min(a.prepaidToman, prepaymentFor(newPriceToman));
  const excess = a.prepaidToman - target;
  if (excess <= 0) return 0;
  const switched = await tx.appointment.updateMany({
    where: { id: a.id, prepaymentStatus: PrepaymentStatus.HELD, prepaidToman: a.prepaidToman },
    data: { prepaidToman: target },
  });
  if (switched.count !== 1) throw new ConflictException("This appointment just changed — reload and try again");
  await moveWallet(tx, a.customerId, excess, WalletTxKind.PREPAYMENT_REFUND, { appointmentId: a.id });
  return excess;
}

/** A salon stylist's commission share of a completed booking's pre-payment (whole toman, rounded down). */
export function stylistShareOfPrepayment(prepaidToman: number, commissionPercent: number): number {
  return Math.max(0, Math.min(prepaidToman, Math.floor((prepaidToman * commissionPercent) / 100)));
}

export interface PrepaidAppointment {
  id: string;
  salonId: string;
  customerId: string;
  prepaidToman: number;
  prepaymentStatus: PrepaymentStatus | null;
  prepaymentStylistToman: number;
  ownerId: string;
  stylistId: string;
  stylistUserId: string;
}

/**
 * Moves a booking's pre-payment to where its new status says it belongs (inside the status
 * update's transaction). The appointment's prepaymentStatus is switched with a conditional update
 * first, so two status changes racing each other can't both move the money. `commissionPercent`
 * is the stylist's frozen rate when it becomes COMPLETED (AppointmentsService.accountingFor).
 */
export async function applyPrepayment(tx: Prisma.TransactionClient, a: PrepaidAppointment, next: AppointmentStatus, commissionPercent = 0) {
  const from = a.prepaymentStatus;
  if (!from || a.prepaidToman <= 0) return;
  const to = prepaymentStateFor(next);
  if (to === from) return;
  // Refunded means the customer already has it back; reopening would need taking it again.
  if (from === PrepaymentStatus.REFUNDED) throw new BadRequestException("A cancelled prepaid booking can't be reopened");

  const stylistPart =
    to === PrepaymentStatus.SETTLED && next === AppointmentStatus.COMPLETED && a.stylistUserId !== a.ownerId
      ? stylistShareOfPrepayment(a.prepaidToman, commissionPercent)
      : 0;
  const switched = await tx.appointment.updateMany({
    where: { id: a.id, prepaymentStatus: from },
    data: { prepaymentStatus: to, prepaymentStylistToman: stylistPart },
  });
  if (switched.count !== 1) throw new ConflictException("This appointment just changed — reload and try again");

  if (from === PrepaymentStatus.SETTLED) {
    // undo: the owner and (if paid) the stylist give back what they got, even below zero
    const paidStylist = a.prepaymentStylistToman;
    await moveWallet(tx, a.ownerId, -(a.prepaidToman - paidStylist), WalletTxKind.PREPAYMENT_INCOME_REVERSAL, { appointmentId: a.id }, true);
    if (paidStylist > 0) {
      await moveWallet(tx, a.stylistUserId, -paidStylist, WalletTxKind.PREPAYMENT_INCOME_REVERSAL, { appointmentId: a.id }, true);
      await tx.stylistPayout.deleteMany({ where: { appointmentId: a.id } });
    }
  }
  if (to === PrepaymentStatus.SETTLED) {
    await moveWallet(tx, a.ownerId, a.prepaidToman - stylistPart, WalletTxKind.PREPAYMENT_INCOME, { appointmentId: a.id });
    if (stylistPart > 0) {
      const payout = await tx.stylistPayout.create({
        data: {
          salonId: a.salonId,
          stylistId: a.stylistId,
          amountToman: stylistPart,
          method: PayoutMethod.WALLET,
          paidAt: new Date(),
          note: "سهم پیش‌پرداخت نوبت (خودکار)",
          appointmentId: a.id,
        },
      });
      await moveWallet(tx, a.stylistUserId, stylistPart, WalletTxKind.PREPAYMENT_INCOME, { appointmentId: a.id, payoutId: payout.id });
    }
  } else if (to === PrepaymentStatus.REFUNDED) {
    await moveWallet(tx, a.customerId, a.prepaidToman, WalletTxKind.PREPAYMENT_REFUND, { appointmentId: a.id });
  }
}
