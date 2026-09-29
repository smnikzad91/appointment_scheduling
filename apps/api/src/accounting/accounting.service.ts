import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AppointmentStatus, NotificationType, Prisma } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonsService } from "../salons/salons.service.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { stylistTake } from "./share.util.js";
import {
  AdjustChargeDto,
  CreateExpenseDto,
  CreatePayoutDto,
  CreateStylistExpenseDto,
  PayoutQueryDto,
  PeriodQueryDto,
  StylistExpenseQueryDto,
  UpdateExpenseDto,
  UpdateStylistExpenseDto,
} from "./dto/accounting.dto.js";

const MAX_PERIOD_DAYS = 400;
const LIST_LIMIT = 500;
const EXPENSE_PAGE_SIZE = 20;
/** Stylist expenses reach back about a year (the panel shows this month and the 11 before). */
const EXPENSE_MAX_AGE_DAYS = 400;

const STYLIST_EXPENSE_SELECT = {
  id: true,
  category: true,
  amountToman: true,
  spentAt: true,
  description: true,
  receiptUrl: true,
} satisfies Prisma.StylistExpenseSelect;

const INCOME_SELECT = {
  id: true,
  startAt: true,
  priceToman: true,
  chargedToman: true,
  stylistCommissionPercent: true,
  tipToman: true,
  stylistShareToman: true,
  customer: { select: { firstName: true, lastName: true } },
  stylist: { select: { id: true, displayName: true } },
  services: { select: { service: { select: { name: true } } } },
} satisfies Prisma.AppointmentSelect;

type IncomeRow = Prisma.AppointmentGetPayload<{ select: typeof INCOME_SELECT }>;

/**
 * chargedToman is what the customer paid for the services; a tip comes on top and is all the
 * stylist's. Income = charged + tip, the stylist's share = commission + tip, so the salon's share
 * (income − stylist's share) is charged − commission and never includes a tip.
 */
function toIncomeItem(a: IncomeRow) {
  const charged = a.chargedToman ?? a.priceToman;
  const tip = a.tipToman ?? 0;
  const share = a.stylistShareToman ?? 0;
  return {
    id: a.id,
    startAt: a.startAt,
    customerName: `${a.customer.firstName} ${a.customer.lastName}`.trim(),
    stylist: a.stylist,
    services: a.services.map((s) => s.service.name),
    priceToman: a.priceToman,
    chargedToman: charged,
    tipToman: tip,
    commissionPercent: a.stylistCommissionPercent ?? 0,
    stylistShareToman: share,
    salonShareToman: charged + tip - share,
  };
}

/**
 * Salon and stylist bookkeeping. Income is recorded per COMPLETED appointment (see
 * AppointmentsService.accountingFor) and dated by the appointment's start; payouts by paidAt;
 * expenses by spentAt. A stylist's balance is all-time: commission earned minus payouts received.
 */
@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salonsService: SalonsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Salon owner ───────────────────────────────────────────────────────────

  async summaryForOwner(userId: string, query: PeriodQueryDto) {
    const salon = await this.salonsService.findMine(userId);
    const { from, to } = this.period(query);
    const completedInPeriod: Prisma.AppointmentWhereInput = {
      salonId: salon.id,
      status: AppointmentStatus.COMPLETED,
      startAt: { gte: from, lt: to },
    };

    const [stylists, byStylist, expensesByCategory, payoutsInPeriod, earnedAllTime, paidAllTime, byService] = await Promise.all([
      this.prisma.stylist.findMany({
        where: { salonId: salon.id },
        select: { id: true, displayName: true, avatarUrl: true, active: true, commissionPercent: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.appointment.groupBy({
        by: ["stylistId"],
        where: completedInPeriod,
        _count: { _all: true },
        _sum: { chargedToman: true, tipToman: true, stylistShareToman: true },
      }),
      this.prisma.salonExpense.groupBy({
        by: ["category"],
        where: { salonId: salon.id, spentAt: { gte: from, lt: to } },
        _sum: { amountToman: true },
      }),
      this.prisma.stylistPayout.groupBy({
        by: ["stylistId"],
        where: { salonId: salon.id, paidAt: { gte: from, lt: to } },
        _sum: { amountToman: true },
      }),
      this.prisma.appointment.groupBy({
        by: ["stylistId"],
        where: { salonId: salon.id, status: AppointmentStatus.COMPLETED },
        _sum: { stylistShareToman: true },
      }),
      this.prisma.stylistPayout.groupBy({ by: ["stylistId"], where: { salonId: salon.id }, _sum: { amountToman: true } }),
      this.prisma.appointmentService.groupBy({
        by: ["serviceId"],
        where: { appointment: completedInPeriod },
        _count: { _all: true },
        _sum: { priceToman: true },
      }),
    ]);

    const periodBy = new Map(byStylist.map((r) => [r.stylistId, r]));
    const paidBy = new Map(payoutsInPeriod.map((r) => [r.stylistId, r._sum.amountToman ?? 0]));
    const earnedBy = new Map(earnedAllTime.map((r) => [r.stylistId, r._sum.stylistShareToman ?? 0]));
    const paidAllBy = new Map(paidAllTime.map((r) => [r.stylistId, r._sum.amountToman ?? 0]));

    const stylistRows = stylists
      .map((s) => {
        const p = periodBy.get(s.id);
        return {
          ...s,
          appointmentCount: p?._count._all ?? 0,
          incomeToman: (p?._sum.chargedToman ?? 0) + (p?._sum.tipToman ?? 0),
          tipsToman: p?._sum.tipToman ?? 0,
          shareToman: p?._sum.stylistShareToman ?? 0,
          paidInPeriodToman: paidBy.get(s.id) ?? 0,
          balanceToman: (earnedBy.get(s.id) ?? 0) - (paidAllBy.get(s.id) ?? 0),
        };
      })
      // Inactive stylists only matter while they have activity or money owed either way.
      .filter((s) => s.active || s.appointmentCount > 0 || s.paidInPeriodToman > 0 || s.balanceToman !== 0);

    const serviceNames = new Map(
      (
        await this.prisma.service.findMany({
          where: { id: { in: byService.map((r) => r.serviceId) } },
          select: { id: true, name: true },
        })
      ).map((s) => [s.id, s.name]),
    );

    const tipsToman = byStylist.reduce((sum, r) => sum + (r._sum.tipToman ?? 0), 0);
    const incomeToman = byStylist.reduce((sum, r) => sum + (r._sum.chargedToman ?? 0), 0) + tipsToman;
    const stylistShareToman = byStylist.reduce((sum, r) => sum + (r._sum.stylistShareToman ?? 0), 0);
    const expensesToman = expensesByCategory.reduce((sum, r) => sum + (r._sum.amountToman ?? 0), 0);
    const salonShareToman = incomeToman - stylistShareToman;

    return {
      period: { from, to },
      totals: {
        appointmentCount: byStylist.reduce((sum, r) => sum + r._count._all, 0),
        incomeToman,
        tipsToman,
        stylistShareToman,
        salonShareToman,
        expensesToman,
        netProfitToman: salonShareToman - expensesToman,
        payoutsToman: payoutsInPeriod.reduce((sum, r) => sum + (r._sum.amountToman ?? 0), 0),
        owedToStylistsToman: stylistRows.reduce((sum, s) => sum + Math.max(0, s.balanceToman), 0),
      },
      stylists: stylistRows,
      services: byService
        .map((r) => ({
          serviceId: r.serviceId,
          name: serviceNames.get(r.serviceId) ?? "—",
          count: r._count._all,
          bookedToman: r._sum.priceToman ?? 0,
        }))
        .sort((a, b) => b.bookedToman - a.bookedToman),
      expensesByCategory: expensesByCategory
        .map((r) => ({ category: r.category, amountToman: r._sum.amountToman ?? 0 }))
        .sort((a, b) => b.amountToman - a.amountToman),
    };
  }

  async incomeForOwner(userId: string, query: PeriodQueryDto) {
    const salon = await this.salonsService.findMine(userId);
    const { from, to } = this.period(query);
    const rows = await this.prisma.appointment.findMany({
      where: {
        salonId: salon.id,
        status: AppointmentStatus.COMPLETED,
        startAt: { gte: from, lt: to },
        ...(query.stylistId && { stylistId: query.stylistId }),
      },
      orderBy: { startAt: "desc" },
      take: LIST_LIMIT,
      select: INCOME_SELECT,
    });
    return rows.map(toIncomeItem);
  }

  /** Correct what a completed appointment actually brought in (and any tip); the stylist's share follows. */
  async adjustCharge(userId: string, appointmentId: string, dto: AdjustChargeDto) {
    const salon = await this.salonsService.findMine(userId);
    const appointment = await this.prisma.appointment.findFirst({ where: { id: appointmentId, salonId: salon.id } });
    if (!appointment) throw new NotFoundException("Appointment not found");
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException("Only a completed appointment has an amount to correct");
    }
    const percent = appointment.stylistCommissionPercent ?? 0;
    const tipToman = dto.tipToman === undefined ? appointment.tipToman : dto.tipToman || null;
    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: { chargedToman: dto.chargedToman, tipToman, stylistShareToman: stylistTake(dto.chargedToman, percent, tipToman) },
      select: INCOME_SELECT,
    });
    return toIncomeItem(updated);
  }

  // Payouts to stylists

  async listPayouts(userId: string, query: PayoutQueryDto) {
    const salon = await this.salonsService.findMine(userId);
    const range = query.from && query.to ? this.period({ from: query.from, to: query.to }) : null;
    return this.prisma.stylistPayout.findMany({
      where: {
        salonId: salon.id,
        ...(query.stylistId && { stylistId: query.stylistId }),
        ...(range && { paidAt: { gte: range.from, lt: range.to } }),
      },
      orderBy: { paidAt: "desc" },
      take: LIST_LIMIT,
      include: { stylist: { select: { id: true, displayName: true } } },
    });
  }

  async createPayout(userId: string, dto: CreatePayoutDto) {
    const salon = await this.salonsService.findMine(userId);
    const stylist = await this.prisma.stylist.findFirst({ where: { id: dto.stylistId, salonId: salon.id }, select: { id: true, userId: true } });
    if (!stylist) throw new BadRequestException("Stylist does not belong to this salon");
    const payout = await this.prisma.stylistPayout.create({
      data: {
        salonId: salon.id,
        stylistId: stylist.id,
        amountToman: dto.amountToman,
        method: dto.method,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        note: dto.note?.trim() || null,
      },
      include: { stylist: { select: { id: true, displayName: true } } },
    });
    await this.notifications.notify([stylist.userId], NotificationType.PAYOUT_RECORDED, {
      payoutId: payout.id,
      amountToman: payout.amountToman,
      method: payout.method,
      paidAt: payout.paidAt.toISOString(),
      note: payout.note,
    });
    return payout;
  }

  async removePayout(userId: string, payoutId: string) {
    const salon = await this.salonsService.findMine(userId);
    const { count } = await this.prisma.stylistPayout.deleteMany({ where: { id: payoutId, salonId: salon.id } });
    if (count === 0) throw new NotFoundException("Payout not found");
    return { ok: true };
  }

  // Salon expenses

  async listExpenses(userId: string, query: PeriodQueryDto) {
    const salon = await this.salonsService.findMine(userId);
    const { from, to } = this.period(query);
    return this.prisma.salonExpense.findMany({
      where: { salonId: salon.id, spentAt: { gte: from, lt: to } },
      orderBy: { spentAt: "desc" },
      take: LIST_LIMIT,
    });
  }

  async createExpense(userId: string, dto: CreateExpenseDto) {
    const salon = await this.salonsService.findMine(userId);
    return this.prisma.salonExpense.create({
      data: {
        salonId: salon.id,
        category: dto.category,
        amountToman: dto.amountToman,
        spentAt: dto.spentAt ? new Date(dto.spentAt) : new Date(),
        note: dto.note?.trim() || null,
        receiptUrl: dto.receiptUrl || null,
      },
    });
  }

  async updateExpense(userId: string, expenseId: string, dto: UpdateExpenseDto) {
    const salon = await this.salonsService.findMine(userId);
    const expense = await this.prisma.salonExpense.findFirst({ where: { id: expenseId, salonId: salon.id } });
    if (!expense) throw new NotFoundException("Expense not found");
    return this.prisma.salonExpense.update({
      where: { id: expense.id },
      data: {
        category: dto.category,
        amountToman: dto.amountToman,
        spentAt: dto.spentAt ? new Date(dto.spentAt) : undefined,
        note: dto.note === undefined ? undefined : dto.note?.trim() || null,
        receiptUrl: dto.receiptUrl === undefined ? undefined : dto.receiptUrl || null,
      },
    });
  }

  async removeExpense(userId: string, expenseId: string) {
    const salon = await this.salonsService.findMine(userId);
    const { count } = await this.prisma.salonExpense.deleteMany({ where: { id: expenseId, salonId: salon.id } });
    if (count === 0) throw new NotFoundException("Expense not found");
    return { ok: true };
  }

  // ── Stylist: their own earnings ───────────────────────────────────────────

  async earningsForStylist(userId: string, query: PeriodQueryDto) {
    const stylist = await this.prisma.stylist.findUnique({
      where: { userId },
      select: { id: true, displayName: true, commissionPercent: true },
    });
    if (!stylist) throw new NotFoundException("Stylist profile not found");
    const { from, to } = this.period(query);

    const [rows, payouts, earned, paid, expenses] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { stylistId: stylist.id, status: AppointmentStatus.COMPLETED, startAt: { gte: from, lt: to } },
        orderBy: { startAt: "desc" },
        take: LIST_LIMIT,
        select: INCOME_SELECT,
      }),
      this.prisma.stylistPayout.findMany({
        where: { stylistId: stylist.id, paidAt: { gte: from, lt: to } },
        orderBy: { paidAt: "desc" },
        select: { id: true, amountToman: true, method: true, paidAt: true, note: true },
      }),
      this.prisma.appointment.aggregate({
        where: { stylistId: stylist.id, status: AppointmentStatus.COMPLETED },
        _sum: { stylistShareToman: true },
      }),
      this.prisma.stylistPayout.aggregate({ where: { stylistId: stylist.id }, _sum: { amountToman: true } }),
      this.prisma.stylistExpense.findMany({
        where: { stylistId: stylist.id, spentAt: { gte: from, lt: to } },
        orderBy: { spentAt: "desc" },
        take: LIST_LIMIT,
        select: STYLIST_EXPENSE_SELECT,
      }),
    ]);

    const items = rows.map(toIncomeItem);
    const shareToman = items.reduce((sum, i) => sum + i.stylistShareToman, 0);
    const expensesToman = expenses.reduce((sum, e) => sum + e.amountToman, 0);
    return {
      period: { from, to },
      stylist,
      totals: {
        appointmentCount: items.length,
        incomeToman: items.reduce((sum, i) => sum + i.chargedToman + i.tipToman, 0),
        tipsToman: items.reduce((sum, i) => sum + i.tipToman, 0),
        shareToman,
        paidInPeriodToman: payouts.reduce((sum, p) => sum + p.amountToman, 0),
        expensesToman,
        // The stylist's own costs come out of what they earned; the salon balance is unaffected.
        netIncomeToman: shareToman - expensesToman,
      },
      balanceToman: (earned._sum.stylistShareToman ?? 0) - (paid._sum.amountToman ?? 0),
      items,
      payouts,
      expenses,
    };
  }

  // ── Stylist: their own expenses ───────────────────────────────────────────

  async listStylistExpenses(userId: string, query: StylistExpenseQueryDto) {
    const stylist = await this.myStylist(userId);
    const { from, to } = this.period(query);
    const where: Prisma.StylistExpenseWhereInput = {
      stylistId: stylist.id,
      spentAt: { gte: from, lt: to },
      ...(query.category && { category: query.category }),
    };
    const pageSize = query.pageSize ?? EXPENSE_PAGE_SIZE;
    const page = query.page ?? 1;
    const [items, agg] = await Promise.all([
      this.prisma.stylistExpense.findMany({
        where,
        orderBy: [{ spentAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: STYLIST_EXPENSE_SELECT,
      }),
      this.prisma.stylistExpense.aggregate({ where, _count: { _all: true }, _sum: { amountToman: true } }),
    ]);
    return { items, total: agg._count._all, totalToman: agg._sum.amountToman ?? 0, page, pageSize };
  }

  async createStylistExpense(userId: string, dto: CreateStylistExpenseDto) {
    const stylist = await this.myStylist(userId);
    this.assertExpenseDate(new Date(dto.spentAt));
    return this.prisma.stylistExpense.create({
      data: {
        stylistId: stylist.id,
        salonId: stylist.salonId,
        category: dto.category,
        amountToman: dto.amountToman,
        spentAt: new Date(dto.spentAt),
        description: dto.description.trim(),
        receiptUrl: dto.receiptUrl || null,
      },
      select: STYLIST_EXPENSE_SELECT,
    });
  }

  async updateStylistExpense(userId: string, expenseId: string, dto: UpdateStylistExpenseDto) {
    const stylist = await this.myStylist(userId);
    const expense = await this.prisma.stylistExpense.findFirst({ where: { id: expenseId, stylistId: stylist.id }, select: { id: true, spentAt: true } });
    if (!expense) throw new NotFoundException("Expense not found");
    // An older expense can still be edited as long as its date isn't moved.
    if (dto.spentAt && new Date(dto.spentAt).getTime() !== expense.spentAt.getTime()) this.assertExpenseDate(new Date(dto.spentAt));
    return this.prisma.stylistExpense.update({
      where: { id: expense.id },
      data: {
        category: dto.category,
        amountToman: dto.amountToman,
        spentAt: dto.spentAt ? new Date(dto.spentAt) : undefined,
        description: dto.description?.trim(),
        receiptUrl: dto.receiptUrl === undefined ? undefined : dto.receiptUrl || null,
      },
      select: STYLIST_EXPENSE_SELECT,
    });
  }

  async removeStylistExpense(userId: string, expenseId: string) {
    const stylist = await this.myStylist(userId);
    const { count } = await this.prisma.stylistExpense.deleteMany({ where: { id: expenseId, stylistId: stylist.id } });
    if (count === 0) throw new NotFoundException("Expense not found");
    return { ok: true };
  }

  private assertExpenseDate(spentAt: Date) {
    if (spentAt.getTime() < Date.now() - EXPENSE_MAX_AGE_DAYS * 86_400_000) throw new BadRequestException("Expense date is too old");
  }

  private async myStylist(userId: string) {
    const stylist = await this.prisma.stylist.findUnique({ where: { userId }, select: { id: true, salonId: true } });
    if (!stylist) throw new NotFoundException("Stylist profile not found");
    return stylist;
  }

  private period(query: { from: string; to: string }) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    if (!(to > from)) throw new BadRequestException("Invalid period");
    if (to.getTime() - from.getTime() > MAX_PERIOD_DAYS * 86_400_000) throw new BadRequestException("Period is too long");
    return { from, to };
  }
}
