import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { WalletTxKind, type Prisma } from "@appointment-scheduling/database";
import { InsufficientWalletError, moveWallet } from "../wallet/prepayment.js";
import { PurchasePlanDto } from "./dto/purchase-plan.dto.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { jalaliPeriod, purchaseEnd, purchaseStart, subscriptionStatus, trialEnd, unusedPurchaseCredit } from "./subscription.util.js";
import { SetSalonSubscriptionDto } from "./dto/set-salon-subscription.dto.js";

type Db = PrismaService | Prisma.TransactionClient;

const PLAN_SUMMARY = { id: true, name: true, monthlyPriceToman: true, maxStylists: true, smsPerMonth: true } as const;

/**
 * Salon plans (PricingPlan rows, edited at /admin/pricing in apps/web) and their limits:
 * how many active stylists a salon may have and how many reminder SMS it gets per Jalali month.
 * A salon without a plan has no limits; an expired one can't add stylists and gets no reminders.
 * The owner buys or renews a plan from their platform wallet (purchase); the platform admin can
 * still assign any plan and end date by hand (setForSalon).
 */
@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Plan for a salon signing up: the one they picked (must be shown on the site), else the
   * recommended/first visible plan, else none. The free trial (PricingSettings) sets the end date.
   */
  async initialFor(planId: string | undefined, db: Db = this.prisma) {
    const plan = planId
      ? await db.pricingPlan.findFirst({ where: { id: planId, active: true }, select: { id: true } })
      : await db.pricingPlan.findFirst({ where: { active: true }, orderBy: [{ recommended: "desc" }, { sortOrder: "asc" }], select: { id: true } });
    if (planId && !plan) throw new BadRequestException("This plan is no longer available");
    if (!plan) return { planId: null, planExpiresAt: null };
    const settings = await db.pricingSettings.findUnique({ where: { id: "singleton" }, select: { trialDays: true } });
    return { planId: plan.id, planExpiresAt: trialEnd(settings?.trialDays ?? 0) };
  }

  /** Throws unless the salon's plan leaves room for one more active stylist. */
  async assertCanAddStylist(salonId: string, db: Db = this.prisma) {
    const salon = await db.salon.findUnique({
      where: { id: salonId },
      select: { planId: true, planExpiresAt: true, plan: { select: { maxStylists: true } } },
    });
    if (!salon?.plan) return;
    if (subscriptionStatus(salon) === "expired") throw new ForbiddenException("Your subscription has expired");
    if (salon.plan.maxStylists === null) return;
    const active = await db.stylist.count({ where: { salonId, active: true } });
    if (active >= salon.plan.maxStylists) throw new ForbiddenException("Your plan's stylist limit is reached");
  }

  /**
   * Takes one reminder SMS from the salon's allowance for the current Jalali month; false means
   * don't send. The conditional increment is atomic, so parallel senders can't overshoot.
   */
  /**
   * Takes `parts` SMS (see smsParts: what the gateway bills) from the salon's monthly allowance, all
   * or nothing: false when they don't all fit (or the plan has none / has expired).
   */
  async takeReminderSms(salonId: string, now = new Date(), parts = 1): Promise<boolean> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { timezone: true, planId: true, planExpiresAt: true, plan: { select: { smsPerMonth: true } } },
    });
    if (!salon) return false;
    const status = subscriptionStatus(salon, now);
    if (status === "expired") return false;
    const limit = salon.plan ? (salon.plan.smsPerMonth ?? 0) : null;
    if (limit === 0) return false;

    const period = jalaliPeriod(now, salon.timezone);
    await this.prisma.salonSmsUsage.createMany({ data: [{ salonId, period }], skipDuplicates: true });
    const taken = await this.prisma.salonSmsUsage.updateMany({
      where: { salonId, period, ...(limit !== null && { sent: { lte: limit - parts } }) },
      data: { sent: { increment: parts } },
    });
    return taken.count === 1;
  }

  /** The owner's view: plan, end date and how much of each limit is used. */
  async getForOwner(userId: string, now = new Date()) {
    const salon = await this.prisma.salon.findFirst({
      where: { ownerId: userId },
      select: { id: true, timezone: true, planId: true, planExpiresAt: true, plan: { select: PLAN_SUMMARY } },
    });
    if (!salon) throw new NotFoundException("You don't own a salon yet");
    const period = jalaliPeriod(now, salon.timezone);
    const [activeStylists, usage] = await Promise.all([
      this.prisma.stylist.count({ where: { salonId: salon.id, active: true } }),
      this.prisma.salonSmsUsage.findUnique({ where: { salonId_period: { salonId: salon.id, period } }, select: { sent: true } }),
    ]);
    return {
      status: subscriptionStatus(salon, now),
      plan: salon.plan,
      expiresAt: salon.planExpiresAt,
      stylists: { active: activeStylists, limit: salon.plan ? salon.plan.maxStylists : null },
      sms: { period, sent: usage?.sent ?? 0, limit: salon.plan ? (salon.plan.smsPerMonth ?? 0) : null },
    };
  }

  /**
   * Plans the owner can buy (visible ones with a set price; null = «توافقی», arranged with the admin),
   * and what switching away from their running plan would credit back (switchCreditToman).
   */
  async purchasablePlans(userId: string, now = new Date()) {
    const salon = await this.prisma.salon.findFirst({ where: { ownerId: userId }, select: { id: true, planId: true } });
    const [plans, running] = await Promise.all([
      this.prisma.pricingPlan.findMany({
        where: { active: true, monthlyPriceToman: { not: null } },
        orderBy: { sortOrder: "asc" },
        select: { ...PLAN_SUMMARY, recommended: true },
      }),
      salon?.planId ? this.runningPurchases(this.prisma, salon.id, salon.planId, now) : Promise.resolve([]),
    ]);
    return { plans, currentPlanId: salon?.planId ?? null, switchCreditToman: unusedPurchaseCredit(running, now) };
  }

  /** The current plan's bought periods that haven't ended or been credited back yet. */
  private runningPurchases(db: Db, salonId: string, planId: string, now: Date) {
    return db.planPurchase.findMany({ where: { salonId, planId, endedAt: null, endsAt: { gt: now } } });
  }

  /**
   * The owner buys `months` of a plan from their wallet: renewing the current plan extends it from
   * its end, another plan starts now. The salon row is locked so two purchases can't both extend
   * from the same end; not enough balance → 402 and nothing changes.
   */
  async purchase(userId: string, dto: PurchasePlanDto, now = new Date()) {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.salon.findFirst({ where: { ownerId: userId }, select: { id: true } });
      if (!found) throw new NotFoundException("You don't own a salon yet");
      await tx.$queryRaw`SELECT 1 FROM salons WHERE id = ${found.id} FOR UPDATE`;
      const salon = await tx.salon.findUniqueOrThrow({ where: { id: found.id }, select: { id: true, ownerId: true, planId: true, planExpiresAt: true } });
      const plan = await tx.pricingPlan.findFirst({ where: { id: dto.planId, active: true }, select: { id: true, name: true, monthlyPriceToman: true } });
      if (!plan) throw new BadRequestException("This plan is no longer available");
      if (plan.monthlyPriceToman === null) throw new BadRequestException("This plan's price is arranged with the platform");
      if (salon.planId === plan.id && salon.planExpiresAt === null) throw new BadRequestException("Your plan has no end date");

      // Switching from a running bought plan: its unused part goes back to the wallet first.
      let creditToman = 0;
      if (salon.planId && salon.planId !== plan.id) {
        const running = await this.runningPurchases(tx, salon.id, salon.planId, now);
        for (const p of running) {
          const credit = unusedPurchaseCredit([p], now);
          await tx.planPurchase.update({ where: { id: p.id }, data: { endedAt: now, creditedToman: credit } });
          if (credit > 0) await moveWallet(tx, salon.ownerId, credit, WalletTxKind.PLAN_CREDIT, { planPurchaseId: p.id });
          creditToman += credit;
        }
      }

      const startsAt = purchaseStart(salon, plan.id, now);
      const endsAt = purchaseEnd(startsAt, dto.months);
      const amountToman = plan.monthlyPriceToman * dto.months;
      const purchase = await tx.planPurchase.create({
        data: { salonId: salon.id, planId: plan.id, planName: plan.name, months: dto.months, amountToman, startsAt, endsAt },
      });
      if (amountToman > 0) {
        const after = await moveWallet(tx, salon.ownerId, -amountToman, WalletTxKind.PLAN_PURCHASE, { planPurchaseId: purchase.id });
        if (after === null) {
          const owner = await tx.user.findUnique({ where: { id: salon.ownerId }, select: { walletBalance: true } });
          throw new InsufficientWalletError(amountToman, owner?.walletBalance ?? 0, "Not enough wallet balance for this plan");
        }
      }
      await tx.salon.update({ where: { id: salon.id }, data: { planId: plan.id, planExpiresAt: endsAt } });
      return { planId: plan.id, planName: plan.name, months: dto.months, amountToman, creditToman, startsAt, expiresAt: endsAt };
    });
  }

  /** Platform admin: assign a plan (hidden plans too — e.g. a custom deal) and an end date. */
  async setForSalon(salonId: string, dto: SetSalonSubscriptionDto) {
    const salon = await this.prisma.salon.findUnique({ where: { id: salonId }, select: { id: true } });
    if (!salon) throw new NotFoundException("Salon not found");
    if (dto.planId !== null) {
      const plan = await this.prisma.pricingPlan.findUnique({ where: { id: dto.planId }, select: { id: true } });
      if (!plan) throw new BadRequestException("This plan is no longer available");
    }
    return this.prisma.salon.update({
      where: { id: salonId },
      data: { planId: dto.planId, planExpiresAt: dto.planId && dto.expiresAt ? new Date(dto.expiresAt) : null },
      select: { id: true, planId: true, planExpiresAt: true, plan: { select: { id: true, name: true } } },
    });
  }
}
