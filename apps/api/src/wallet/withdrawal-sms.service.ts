import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { SmsService } from "../sms/sms.service.js";
import { runsBackgroundJobs } from "../sms/job-runner.js";
import { faMoney, withdrawalText } from "../sms/sms.text.js";

const TICK_MS = 30_000;
const MAX_ATTEMPTS = 3;
const FRESH_MS = 24 * 60 * 60_000;

/**
 * Texts the account when the platform admin paid («… به حسابتان واریز شد» + tracking code) or rejected
 * («… رد شد؛ مبلغ به کیف پول برگشت») their withdrawal (apps/web lib/withdrawals.ts closes it). A
 * cancellation by the user themselves isn't texted. Same claim / 3 tries as the top-up SMS
 * (WithdrawalRequest.decidedSmsAt); api instance 0, every 30 s.
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
      const due = await this.prisma.withdrawalRequest.findMany({
        where: { status: { in: ["PAID", "REJECTED"] }, decidedSmsAt: null, decidedAt: { gte: new Date(now.getTime() - FRESH_MS) } },
        orderBy: { decidedAt: "asc" },
        take: 20,
        select: { id: true, status: true, amountToman: true, trackingCode: true, decidedSmsAttempts: true, user: { select: { phone: true } } },
      });
      let sent = 0;
      for (const w of due) {
        const claimed = await this.prisma.withdrawalRequest.updateMany({ where: { id: w.id, decidedSmsAt: null }, data: { decidedSmsAt: now } });
        if (claimed.count !== 1 || !w.user.phone) continue;
        const kind = w.status === "PAID" ? "withdrawal-paid" : "withdrawal-rejected";
        const params = { amount: faMoney(w.amountToman), trackingCode: w.trackingCode ?? "" };
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
    } finally {
      this.running = false;
    }
  }
}
