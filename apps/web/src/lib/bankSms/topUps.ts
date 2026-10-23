import { createHash, randomUUID } from "crypto";
import { Prisma } from "@appointment-scheduling/database";
import { prisma } from "@/lib/prisma";
import { compileTemplate, parseSms, pickOffsetRial, senderMatches } from "./template";
import { cancelPayment, createPayment, getPayment, nodepassEnabled, NodepassError, type NodepassPayment } from "@/lib/nodepass";

// Wallet top-ups confirmed by the bank's deposit SMS (apps/bank-sms-agent on the BeagleBone
// forwards every SMS to /api/bank-sms/messages). The customer pays amountToman×10 + 1–1000 rial to
// a platform card; the SMS with that exact rial amount, from that card's bank sender and fitting
// its template, pays the top-up and credits the wallet — once (conditional update).

export const TOP_UP_TTL_MS = 30 * 60_000;
/** Bank SMS can arrive late: a top-up still matches this long after it expired. */
export const LATE_SMS_GRACE_MS = 15 * 60_000;
export const MIN_TOP_UP_TOMAN = 10_000;
export const MAX_TOP_UP_TOMAN = 50_000_000;

/** What a top-up credits: everything paid, in whole toman (the extra rial included, rounded down). */
export const creditOf = (payableRial: bigint) => Number(payableRial / BigInt(10));

/** Platform cards that can take automatic top-ups (sender + template set). */
export function autoCards() {
  return prisma.adminCard.findMany({ where: { smsSender: { not: null }, smsTemplate: { not: null } }, orderBy: { createdAt: "asc" } });
}

/** Pending top-ups past expiry + grace become EXPIRED (their exact amounts are free again). */
export function expireStale(now = new Date()) {
  return prisma.walletTopUp.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date(now.getTime() - LATE_SMS_GRACE_MS) } },
    data: { status: "EXPIRED" },
  });
}

export class TopUpError extends Error {}

/**
 * A new top-up for this user: card + exact rial amount to pay. Any earlier pending one is cancelled,
 * except with keepPending (the mychatbot.ir service account has many customers paying at once).
 */
export async function createTopUp(userId: string, amountToman: number, { keepPending = false } = {}) {
  if (!Number.isInteger(amountToman) || amountToman < MIN_TOP_UP_TOMAN || amountToman > MAX_TOP_UP_TOMAN) {
    throw new TopUpError(`مبلغ باید بین ${MIN_TOP_UP_TOMAN.toLocaleString("fa-IR")} و ${MAX_TOP_UP_TOMAN.toLocaleString("fa-IR")} تومان باشد`);
  }
  if (nodepassEnabled()) return createNodepassTopUp(userId, amountToman, keepPending);
  const cards = await autoCards();
  if (cards.length === 0) throw new TopUpError("افزایش خودکار موجودی فعلاً فعال نیست؛ از «ثبت واریز» با رسید استفاده کنید");
  await expireStale();
  if (!keepPending) await prisma.walletTopUp.updateMany({ where: { userId, status: "PENDING" }, data: { status: "CANCELLED" } });
  const card = cards[Math.floor(Math.random() * cards.length)];
  const baseRial = BigInt(amountToman) * BigInt(10);
  for (let attempt = 0; attempt < 5; attempt++) {
    const pending = await prisma.walletTopUp.findMany({
      where: { adminCardId: card.id, status: "PENDING", payableRial: { gt: baseRial, lte: baseRial + BigInt(1000) } },
      select: { payableRial: true },
    });
    let offset: number;
    try {
      offset = pickOffsetRial(baseRial, new Set(pending.map((p) => p.payableRial)));
    } catch {
      throw new TopUpError("همین حالا درخواست‌های زیادی با این مبلغ هست؛ مبلغ کمی متفاوت وارد کنید");
    }
    try {
      return await prisma.walletTopUp.create({
        data: { userId, adminCardId: card.id, amountToman, offsetRial: offset, payableRial: baseRial + BigInt(offset), expiresAt: new Date(Date.now() + TOP_UP_TTL_MS) },
        include: { adminCard: true },
      });
    } catch (err) {
      // the partial unique index: someone took that exact amount a moment ago — pick again
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }
  throw new TopUpError("ساخت درخواست انجام نشد؛ دوباره تلاش کنید");
}

/** createTopUp through nodepass.ir: it picks the card and the extra rial; our id is its clientOrderId. */
async function createNodepassTopUp(userId: string, amountToman: number, keepPending: boolean) {
  await expireStale();
  if (!keepPending) {
    const open = await prisma.walletTopUp.findMany({ where: { userId, status: "PENDING" }, select: { id: true, nodepassPaymentId: true } });
    for (const t of open) await cancelTopUp(t.id, t.nodepassPaymentId);
  }
  const id = randomUUID();
  let p: NodepassPayment;
  try {
    p = await createPayment(amountToman, id);
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
    include: { adminCard: true },
  });
}

/** Cancel a pending top-up here and at nodepass. False if nodepass says it's no longer pending (maybe paid). */
export async function cancelTopUp(id: string, nodepassPaymentId: string | null): Promise<boolean> {
  if (nodepassPaymentId) {
    try {
      await cancelPayment(nodepassPaymentId);
    } catch (err) {
      if (err instanceof NodepassError && err.code === "not_pending") {
        await syncNodepassTopUp(id, { force: true });
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
 * (paidRial: an admin may match a deposit of another amount), once. Also an EXPIRED or CANCELLED top-up —
 * the money arrived. Called from the webhook and the poll.
 */
export async function payNodepassTopUp(p: NodepassPayment): Promise<boolean> {
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
export async function applyNodepassPayment(p: NodepassPayment) {
  if (p.status === "PAID") return payNodepassTopUp(p);
  if (p.status === "CANCELLED") await prisma.walletTopUp.updateMany({ where: { nodepassPaymentId: p.id, status: "PENDING" }, data: { status: "CANCELLED" } });
  // EXPIRED: expireStale() does it by time; nodepass may still pay it within the late-SMS grace
  return false;
}

const lastSync = new Map<string, number>();
/**
 * Fallback for a missed webhook while the customer waits: ask nodepass about a pending (or recently
 * expired) top-up, at most every 10 s per top-up.
 */
export async function syncNodepassTopUp(id: string, { force = false } = {}) {
  const topUp = await prisma.walletTopUp.findUnique({ where: { id }, select: { nodepassPaymentId: true, status: true, expiresAt: true } });
  if (!topUp?.nodepassPaymentId || topUp.status === "PAID") return;
  if (topUp.status !== "PENDING" && topUp.expiresAt.getTime() < Date.now() - LATE_SMS_GRACE_MS) return;
  const last = lastSync.get(id) ?? 0;
  if (!force && Date.now() - last < 10_000) return;
  lastSync.set(id, Date.now());
  if (lastSync.size > 1000) lastSync.delete(lastSync.keys().next().value!);
  try {
    await applyNodepassPayment(await getPayment(topUp.nodepassPaymentId));
  } catch (err) {
    console.error("[nodepass] sync top-up", id, err instanceof Error ? err.message : err);
  }
}

export interface IncomingSms {
  deviceId: string;
  sender: string;
  body: string;
  receivedAt: Date;
}

export type IngestResult = { duplicate: true } | { duplicate: false; status: "MATCHED" | "UNMATCHED" | "NOT_DEPOSIT"; topUpId?: string };

/** One SMS from the device: stored once (idempotent), parsed against the cards, matched, credited. */
export async function ingestSms(sms: IncomingSms): Promise<IngestResult> {
  const hash = createHash("sha256").update([sms.deviceId, sms.sender, sms.receivedAt.toISOString(), sms.body].join("\u0000")).digest("hex");
  if (await prisma.bankSms.findUnique({ where: { hash }, select: { id: true } })) return { duplicate: true };

  // a card may list several senders (senderList)
  const cards = (await autoCards()).filter((c) => senderMatches(c.smsSender!, sms.sender));
  let card: (typeof cards)[number] | undefined;
  let parsed: ReturnType<typeof parseSms> = null;
  for (const c of cards) {
    try {
      parsed = parseSms(compileTemplate(c.smsTemplate!), sms.body);
    } catch {
      parsed = null; // a broken template never blocks storing the SMS
    }
    if (parsed) {
      card = c;
      break;
    }
  }
  const base = { hash, deviceId: sms.deviceId, sender: sms.sender, body: sms.body, receivedAt: sms.receivedAt };
  if (!card || !parsed) {
    await saveSms({ ...base, adminCardId: cards[0]?.id ?? null, status: "NOT_DEPOSIT", note: cards.length ? "" : "فرستنده با هیچ کارتی جور نیست" });
    return { duplicate: false, status: "NOT_DEPOSIT" };
  }

  await expireStale();
  const t = sms.receivedAt.getTime();
  const candidates = await prisma.walletTopUp.findMany({
    where: {
      adminCardId: card.id,
      status: "PENDING",
      payableRial: parsed.amountRial,
      // the SMS can't predate the request (2 min of clock skew), nor come long after it expired
      createdAt: { lte: new Date(t + 2 * 60_000) },
      expiresAt: { gte: new Date(t - LATE_SMS_GRACE_MS) },
    },
  });
  const data = { ...base, adminCardId: card.id, amountRial: parsed.amountRial, balanceRial: parsed.balanceRial };
  if (candidates.length !== 1) {
    await saveSms({ ...data, status: "UNMATCHED", note: candidates.length > 1 ? "چند درخواست با همین مبلغ" : "" });
    return { duplicate: false, status: "UNMATCHED" };
  }
  const topUp = candidates[0];
  const paid = await payTopUp(topUp.id, { ...data, status: "MATCHED" });
  return paid ? { duplicate: false, status: "MATCHED", topUpId: topUp.id } : { duplicate: false, status: "UNMATCHED" };
}

type SmsRow = Omit<Prisma.BankSmsUncheckedCreateInput, "id" | "createdAt">;

async function saveSms(row: SmsRow) {
  try {
    await prisma.bankSms.create({ data: row });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err; // a resend raced us
  }
}

/**
 * Pays a top-up and credits the wallet in one transaction, at most once: the PENDING→PAID update is
 * conditional. `sms` is stored with it (new) or linked to it (existing id, manual match).
 */
export async function payTopUp(topUpId: string, sms: SmsRow | { existingSmsId: string }, allowExpired = false) {
  return prisma.$transaction(async (tx) => {
    const topUp = await tx.walletTopUp.findUnique({ where: { id: topUpId } });
    if (!topUp) return false;
    const claimed = await tx.walletTopUp.updateMany({
      where: { id: topUpId, status: { in: allowExpired ? ["PENDING", "EXPIRED"] : ["PENDING"] } },
      data: { status: "PAID", paidAt: new Date(), creditedToman: creditOf(topUp.payableRial) },
    });
    if (claimed.count !== 1) return false;
    const credited = creditOf(topUp.payableRial);
    const user = await tx.user.update({ where: { id: topUp.userId }, data: { walletBalance: { increment: credited } }, select: { walletBalance: true } });
    await tx.walletTransaction.create({ data: { userId: topUp.userId, kind: "TOP_UP", amountToman: credited, balanceAfter: user.walletBalance, topUpId } });
    if ("existingSmsId" in sms) {
      await tx.bankSms.update({ where: { id: sms.existingSmsId }, data: { status: "MATCHED", topUpId } });
    } else {
      await tx.bankSms.create({ data: { ...sms, topUpId } });
    }
    return true;
  });
}

export type ExternalMatch = "ok" | "sms_taken" | "top_up_taken" | "sms_mismatch";

/**
 * mychatbot.ir's admin settles an UNMATCHED deposit SMS against one of its top-ups (also an expired or
 * cancelled one: the customer paid late or the wrong amount). The SMS must have come to the same card and
 * not before the top-up was made (2 min of clock skew) — so it can't take a deposit made for something
 * else — and the wallet is credited what the SMS says was paid, not the amount asked for. Both are claimed
 * conditionally in one transaction, so an SMS pays at most one top-up even if nobatet's own admin matches
 * it at the same time.
 */
export async function matchExternalSms(topUpId: string, smsId: string): Promise<ExternalMatch> {
  class Abort extends Error {
    constructor(readonly result: ExternalMatch) { super(result); }
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const topUp = await tx.walletTopUp.findUnique({ where: { id: topUpId } });
      if (!topUp) throw new Abort("top_up_taken");
      const found = await tx.bankSms.findUnique({ where: { id: smsId } });
      if (!found || found.status !== "UNMATCHED" || found.topUpId) throw new Abort("sms_taken");
      if (
        found.adminCardId !== topUp.adminCardId ||
        found.amountRial === null ||
        found.amountRial <= BigInt(0) ||
        found.receivedAt.getTime() < topUp.createdAt.getTime() - 2 * 60_000
      ) {
        throw new Abort("sms_mismatch");
      }
      const sms = await tx.bankSms.updateMany({ where: { id: smsId, status: "UNMATCHED", topUpId: null }, data: { status: "MATCHED", topUpId, note: "mychatbot.ir" } });
      if (sms.count !== 1) throw new Abort("sms_taken");
      const credited = creditOf(found.amountRial);
      const claimed = await tx.walletTopUp.updateMany({
        where: { id: topUpId, status: { in: ["PENDING", "EXPIRED", "CANCELLED"] } },
        data: { status: "PAID", paidAt: new Date(), creditedToman: credited },
      });
      if (claimed.count !== 1) throw new Abort("top_up_taken");
      const user = await tx.user.update({ where: { id: topUp.userId }, data: { walletBalance: { increment: credited } }, select: { walletBalance: true } });
      await tx.walletTransaction.create({ data: { userId: topUp.userId, kind: "TOP_UP", amountToman: credited, balanceAfter: user.walletBalance, topUpId } });
      return "ok" as const;
    });
  } catch (err) {
    if (err instanceof Abort) return err.result;
    // the top-up already has an SMS (bank_sms.topUpId is unique)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return "top_up_taken";
    throw err;
  }
}

/** JSON-safe top-up for the customer (BigInt → string). */
export function topUpJson(t: {
  id: string; amountToman: number; offsetRial: number; payableRial: bigint; status: string; expiresAt: Date; paidAt: Date | null; creditedToman: number | null; createdAt: Date;
  adminCard?: { cardNumber: string; ownerName: string; bankName: string } | null;
  trackingCode?: string | null; cardNumber?: string | null; cardOwnerName?: string | null; cardBankName?: string | null;
}) {
  // nodepass top-ups carry the card on the row
  const card = t.adminCard ?? (t.cardNumber ? { cardNumber: t.cardNumber, ownerName: t.cardOwnerName ?? "", bankName: t.cardBankName ?? "" } : null);
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
    card: card ? { cardNumber: card.cardNumber, ownerName: card.ownerName, bankName: card.bankName } : null,
    trackingCode: t.trackingCode ?? null,
  };
}
