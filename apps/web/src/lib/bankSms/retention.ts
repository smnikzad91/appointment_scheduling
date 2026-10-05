import { prisma } from "@/lib/prisma";

/** SMS from senders that aren't on any card (operator ads, codes, personal texts) are kept this long. */
export const FOREIGN_SMS_DAYS = 30;

/**
 * Deletes forwarded SMS that have nothing to do with payments: no card's sender (adminCardId null),
 * not a deposit, never matched to a top-up, older than 30 days. Bank SMS (deposits, withdrawals,
 * anything from a card's sender) are kept. Run daily from instrumentation.ts.
 */
export async function pruneForeignSms(now = new Date()) {
  const { count } = await prisma.bankSms.deleteMany({
    where: {
      adminCardId: null,
      status: "NOT_DEPOSIT",
      topUpId: null,
      createdAt: { lt: new Date(now.getTime() - FOREIGN_SMS_DAYS * 24 * 60 * 60 * 1000) },
    },
  });
  return count;
}
