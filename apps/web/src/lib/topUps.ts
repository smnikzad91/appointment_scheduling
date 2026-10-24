import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { cancelPayment, createPayment, getPayment, nodepassConfigured, NodepassError, type NodepassPayment } from "@/lib/nodepass";

// Wallet top-ups by card-to-card through nodepass.ir (lib/nodepass.ts). nodepass picks the card and an
// extra 1–1000 rial that makes the amount unique, watches the bank's deposit SMS and calls our webhook
// (app/api/nodepass/webhook) when the payment is paid, expired or cancelled. Our top-up id is its
// clientOrderId; the wallet is credited once (conditional PENDING/EXPIRED/CANCELLED → PAID update).
// Unmatched deposits are settled in nodepass's admin, which then pays the payment the same way.

/** A deposit can be confirmed late: a top-up still accepts nodepass's "paid" this long after it expired. */
export const LATE_PAYMENT_GRACE_MS = 15 * 60_000;
export const MIN_TOP_UP_TOMAN = 10_000;
export const MAX_TOP_UP_TOMAN = 50_000_000;

/** What a top-up credits: everything paid, in whole toman (the extra rial included, rounded down). */
export const creditOf = (paidRial: bigint) => Number(paidRial / BigInt(10));

/** Whether the customer can top up at all (nodepass configured). */
export const topUpsAvailable = nodepassConfigured;

/** Pending top-ups past expiry + grace become EXPIRED. */
export function expireStale(now = new Date()) {
  return prisma.walletTopUp.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date(now.getTime() - LATE_PAYMENT_GRACE_MS) } },
    data: { status: "EXPIRED" },
  });
}

export class TopUpError extends Error {}

/** Wallet pages a top-up can start from; nodepass's status page links back to it. */
const WALLET_PATHS = ["/dashboard/finance", "/salon/wallet", "/stylist/wallet"];
export const walletPath = (path: unknown) => (typeof path === "string" && WALLET_PATHS.includes(path) ? path : WALLET_PATHS[0]);

/** A new top-up for this user: nodepass's card + exact rial amount to pay. Any earlier pending one is cancelled. */
export async function createTopUp(userId: string, amountToman: number, returnPath = WALLET_PATHS[0]) {
  if (!Number.isInteger(amountToman) || amountToman < MIN_TOP_UP_TOMAN || amountToman > MAX_TOP_UP_TOMAN) {
    throw new TopUpError(`مبلغ باید بین ${MIN_TOP_UP_TOMAN.toLocaleString("fa-IR")} و ${MAX_TOP_UP_TOMAN.toLocaleString("fa-IR")} تومان باشد`);
  }
  if (!topUpsAvailable()) throw new TopUpError("افزایش موجودی فعلاً فعال نیست؛ کمی بعد دوباره تلاش کنید");
  await expireStale();
  const open = await prisma.walletTopUp.findMany({ where: { userId, status: "PENDING" }, select: { id: true, nodepassPaymentId: true } });
  for (const t of open) await cancelTopUp(t.id, t.nodepassPaymentId);
  const id = randomUUID();
  let p: NodepassPayment;
  try {
    p = await createPayment(amountToman, id, walletPath(returnPath));
  } catch (err) {
    // amount out of range / no card online: nodepass's Persian message is meant for the customer
    if (err instanceof NodepassError && (err.status === 400 || err.status === 503)) throw new TopUpError(err.message);
    throw err;
  }
  return prisma.walletTopUp.create({
    data: {
      id,
      userId,
      amountToman,
      offsetRial: p.offsetRial,
      payableRial: BigInt(p.payableRial),
      expiresAt: new Date(p.expiresAt),
      nodepassPaymentId: p.id,
      trackingCode: p.trackingCode,
      cardNumber: p.card.number,
      cardOwnerName: p.card.ownerName,
      cardBankName: p.card.bankName,
    },
  });
}

/** Cancel a pending top-up here and at nodepass. False if nodepass says it's no longer pending (maybe paid). */
export async function cancelTopUp(id: string, nodepassPaymentId: string | null): Promise<boolean> {
  if (nodepassPaymentId) {
    try {
      await cancelPayment(nodepassPaymentId);
    } catch (err) {
      if (err instanceof NodepassError && err.code === "not_pending") {
        await syncTopUp(id, { force: true });
        return false;
      }
      throw err;
    }
  }
  const { count } = await prisma.walletTopUp.updateMany({ where: { id, status: "PENDING" }, data: { status: "CANCELLED" } });
  return count === 1;
}

/**
 * nodepass says this payment is paid: the top-up is PAID and the wallet credited what was really paid
 * (paidRial: nodepass's admin may match a deposit of another amount), once. Also an EXPIRED or CANCELLED
 * top-up — the money arrived. apps/api wallet/top-up-sms.service then texts the customer.
 */
export async function payTopUp(p: NodepassPayment): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const topUp = await tx.walletTopUp.findUnique({ where: { nodepassPaymentId: p.id } });
    if (!topUp) return false;
    const credited = creditOf(BigInt(p.paidRial ?? p.payableRial));
    const claimed = await tx.walletTopUp.updateMany({
      where: { id: topUp.id, status: { in: ["PENDING", "EXPIRED", "CANCELLED"] } },
      data: { status: "PAID", paidAt: p.paidAt ? new Date(p.paidAt) : new Date(), creditedToman: credited },
    });
    if (claimed.count !== 1) return false;
    const user = await tx.user.update({ where: { id: topUp.userId }, data: { walletBalance: { increment: credited } }, select: { walletBalance: true } });
    await tx.walletTransaction.create({ data: { userId: topUp.userId, kind: "TOP_UP", amountToman: credited, balanceAfter: user.walletBalance, topUpId: topUp.id } });
    return true;
  });
}

/** Apply a nodepass payment's state to its top-up (webhook payload or a fresh GET). */
export async function applyPayment(p: NodepassPayment) {
  if (p.status === "PAID") return payTopUp(p);
  if (p.status === "CANCELLED") await prisma.walletTopUp.updateMany({ where: { nodepassPaymentId: p.id, status: "PENDING" }, data: { status: "CANCELLED" } });
  // EXPIRED: expireStale() does it by time; nodepass may still pay it within the grace
  return false;
}

const lastSync = new Map<string, number>();
/**
 * Fallback for a missed webhook while the customer waits: ask nodepass about a pending (or recently
 * expired) top-up, at most every 10 s per top-up.
 */
export async function syncTopUp(id: string, { force = false } = {}) {
  const topUp = await prisma.walletTopUp.findUnique({ where: { id }, select: { nodepassPaymentId: true, status: true, expiresAt: true } });
  if (!topUp?.nodepassPaymentId || topUp.status === "PAID") return;
  if (topUp.status !== "PENDING" && topUp.expiresAt.getTime() < Date.now() - LATE_PAYMENT_GRACE_MS) return;
  const last = lastSync.get(id) ?? 0;
  if (!force && Date.now() - last < 10_000) return;
  lastSync.set(id, Date.now());
  if (lastSync.size > 1000) lastSync.delete(lastSync.keys().next().value!);
  try {
    await applyPayment(await getPayment(topUp.nodepassPaymentId));
  } catch (err) {
    console.error("[nodepass] sync top-up", id, err instanceof Error ? err.message : err);
  }
}

/** JSON-safe top-up for the customer (BigInt → string). */
export function topUpJson(t: {
  id: string; amountToman: number; offsetRial: number; payableRial: bigint; status: string; expiresAt: Date; paidAt: Date | null; creditedToman: number | null; createdAt: Date;
  trackingCode: string | null; cardNumber: string | null; cardOwnerName: string | null; cardBankName: string | null;
}) {
  return {
    id: t.id,
    amountToman: t.amountToman,
    offsetRial: t.offsetRial,
    payableRial: t.payableRial.toString(),
    status: t.status.toLowerCase(),
    expiresAt: t.expiresAt,
    paidAt: t.paidAt,
    creditedToman: t.creditedToman,
    createdAt: t.createdAt,
    card: t.cardNumber ? { cardNumber: t.cardNumber, ownerName: t.cardOwnerName ?? "", bankName: t.cardBankName ?? "" } : null,
    trackingCode: t.trackingCode,
  };
}
