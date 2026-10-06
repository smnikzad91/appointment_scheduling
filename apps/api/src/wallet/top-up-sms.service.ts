import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { SmsService } from "../sms/sms.service.js";
import { runsBackgroundJobs } from "../sms/job-runner.js";
import { faMoney, topUpPaidText } from "../sms/sms.text.js";

const TICK_MS = 20_000;
const MAX_ATTEMPTS = 3;
/** Only top-ups paid this recently are texted (a long outage doesn't send stale news). */
const FRESH_MS = 24 * 60 * 60_000;

/**
 * Texts the customer when their wallet top-up is paid — matched by the bank SMS or by the admin,
 * both in apps/web (lib/bankSms/topUps.ts payTopUp), which only flips the row to PAID; this job
 * (api instance 0, every 20 s) sends «کیف پول نوبتت … تومان شارژ شد / موجودی: …». Each top-up
 * is claimed by a conditional update of paidSmsAt before sending, so it's never sent twice; a
 * failed send is released and retried, up to 3 tries. Transactional: no opt-out, no salon allowance.
 */
@Injectable()
export class TopUpSmsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TopUpSmsService.name);
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

  /** One pass; returns how many texts were sent. */
  async run(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const due = await this.prisma.walletTopUp.findMany({
        where: { status: "PAID", paidSmsAt: null, paidAt: { gte: new Date(now.getTime() - FRESH_MS) } },
        orderBy: { paidAt: "asc" },
        take: 20,
        select: {
          id: true,
          creditedToman: true,
          paidSmsAttempts: true,
          user: { select: { phone: true } },
          transaction: { select: { balanceAfter: true } },
        },
      });
      let sent = 0;
      for (const t of due) {
        const claimed = await this.prisma.walletTopUp.updateMany({ where: { id: t.id, paidSmsAt: null }, data: { paidSmsAt: now } });
        if (claimed.count !== 1) continue; // another runner has it
        if (!t.user.phone) continue; // no number: nothing to send, stays marked
        const params = { amount: faMoney(t.creditedToman ?? 0), balance: faMoney(t.transaction?.balanceAfter ?? 0) };
        if (await this.sms.send({ kind: "topup-paid", to: t.user.phone, params, text: topUpPaidText(params) })) {
          sent++;
          continue;
        }
        const attempts = t.paidSmsAttempts + 1;
        // failed: release it for another try, or give up (stays marked) after MAX_ATTEMPTS
        await this.prisma.walletTopUp.update({
          where: { id: t.id },
          data: { paidSmsAttempts: attempts, ...(attempts < MAX_ATTEMPTS && { paidSmsAt: null }) },
        });
      }
      return sent;
    } finally {
      this.running = false;
    }
  }
}
