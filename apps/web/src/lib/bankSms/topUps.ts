import { createHash } from "crypto";
import { Prisma } from "@appointment-scheduling/database";
import { prisma } from "@/lib/prisma";
import { compileTemplate, parseSms, pickOffsetRial, senderMatches } from "./template";

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

/** A new top-up for this user (any earlier pending one is cancelled): card + exact rial amount to pay. */
export async function createTopUp(userId: string, amountToman: number) {
  if (!Number.isInteger(amountToman) || amountToman < MIN_TOP_UP_TOMAN || amountToman > MAX_TOP_UP_TOMAN) {
    throw new TopUpError(`مبلغ باید بین ${MIN_TOP_UP_TOMAN.toLocaleString("fa-IR")} و ${MAX_TOP_UP_TOMAN.toLocaleString("fa-IR")} تومان باشد`);
  }
  const cards = await autoCards();
  if (cards.length === 0) throw new TopUpError("افزایش خودکار موجودی فعلاً فعال نیست؛ از «ثبت واریز» با رسید استفاده کنید");
  await expireStale();
  await prisma.walletTopUp.updateMany({ where: { userId, status: "PENDING" }, data: { status: "CANCELLED" } });
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

/** JSON-safe top-up for the customer (BigInt → string). */
export function topUpJson(t: { id: string; amountToman: number; offsetRial: number; payableRial: bigint; status: string; expiresAt: Date; paidAt: Date | null; creditedToman: number | null; createdAt: Date; adminCard?: { cardNumber: string; ownerName: string; bankName: string } }) {
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
    card: t.adminCard ? { cardNumber: t.adminCard.cardNumber, ownerName: t.adminCard.ownerName, bankName: t.adminCard.bankName } : null,
  };
}
