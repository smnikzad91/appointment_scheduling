import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { SmsService } from "../sms/sms.service.js";
import { runsBackgroundJobs } from "../sms/job-runner.js";
import { adminWithdrawalText, faMoney, withdrawalText } from "../sms/sms.text.js";

const TICK_MS = 30_000;
const MAX_ATTEMPTS = 3;
const FRESH_MS = 24 * 60 * 60_000;

/**
 * Texts the account when the platform admin paid («… به حسابتان واریز شد» + tracking code — the amount
 * after the withdrawal fee, WithdrawalRequest.feeToman) or rejected
 * («… رد شد؛ مبلغ به کیف پول برگشت») their withdrawal (apps/web lib/withdrawals.ts closes it). A
 * cancellation by the user themselves isn't texted. Same claim / 3 tries as the top-up SMS
 * (WithdrawalRequest.decidedSmsAt); api instance 0, every 30 s.
 * Also texts the platform admin (ADMIN_ALERT_PHONE) each new request, «درخواست برداشت … از …»
 * (WithdrawalRequest.requestedSmsAt; the platform's SMS, not charged to anyone).
 */
@Injectable()
export class WithdrawalSmsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(WithdrawalSmsService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === "test" || !runsBackgroundJobs()) return;
    this.timer = setInterval(() => void this.run().catch((e) => this.logger.warn(`run failed: ${(e as Error).message}`)), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      return (await this.textAdmin(now)) + (await this.textDecided(now));
    } finally {
      this.running = false;
    }
  }

  /** New requests (any status: one cancelled within seconds is still worth knowing about) to the admin. */
  private async textAdmin(now: Date): Promise<number> {
    const to = this.sms.adminAlertPhone;
    if (!to) return 0;
    const due = await this.prisma.withdrawalRequest.findMany({
      where: { requestedSmsAt: null, createdAt: { gte: new Date(now.getTime() - FRESH_MS) } },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true, amountToman: true, feeToman: true, requestedSmsAttempts: true, user: { select: { firstName: true, lastName: true, phone: true } } },
    });
    let sent = 0;
    for (const w of due) {
      const claimed = await this.prisma.withdrawalRequest.updateMany({ where: { id: w.id, requestedSmsAt: null }, data: { requestedSmsAt: now } });
      if (claimed.count !== 1) continue;
      const name = `${w.user.firstName} ${w.user.lastName}`.trim() || w.user.phone || "کاربر";
      // what the admin transfers: the amount minus the withdrawal fee
      const params = { amount: faMoney(w.amountToman - (w.feeToman ?? 0)), name };
      if (await this.sms.send({ kind: "admin-withdrawal-request", to, params, text: adminWithdrawalText(params) })) {
        sent++;
        continue;
      }
      const attempts = w.requestedSmsAttempts + 1;
      await this.prisma.withdrawalRequest.update({
        where: { id: w.id },
        data: { requestedSmsAttempts: attempts, ...(attempts < MAX_ATTEMPTS && { requestedSmsAt: null }) },
      });
    }
    return sent;
  }

  private async textDecided(now: Date): Promise<number> {
    const due = await this.prisma.withdrawalRequest.findMany({
      where: { status: { in: ["PAID", "REJECTED"] }, decidedSmsAt: null, decidedAt: { gte: new Date(now.getTime() - FRESH_MS) } },
      orderBy: { decidedAt: "asc" },
      take: 20,
      select: { id: true, status: true, amountToman: true, feeToman: true, trackingCode: true, decidedSmsAttempts: true, user: { select: { phone: true } } },
    });
    let sent = 0;
    for (const w of due) {
      const claimed = await this.prisma.withdrawalRequest.updateMany({ where: { id: w.id, decidedSmsAt: null }, data: { decidedSmsAt: now } });
      if (claimed.count !== 1 || !w.user.phone) continue;
      const kind = w.status === "PAID" ? "withdrawal-paid" : "withdrawal-rejected";
      // paid: what reached their account (amount − fee); rejected: the whole amount went back to the wallet
      const amount = w.status === "PAID" ? w.amountToman - (w.feeToman ?? 0) : w.amountToman;
      const params = { amount: faMoney(amount), trackingCode: w.trackingCode ?? "" };
      if (await this.sms.send({ kind, to: w.user.phone, params, text: withdrawalText(kind, params) })) {
        sent++;
        continue;
      }
      const attempts = w.decidedSmsAttempts + 1;
      await this.prisma.withdrawalRequest.update({
        where: { id: w.id },
        data: { decidedSmsAttempts: attempts, ...(attempts < MAX_ATTEMPTS && { decidedSmsAt: null }) },
      });
    }
    return sent;
  }
}
