import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateStylistExpenseDto, UpdateStylistExpenseDto } from './dto/accounting.dto.js';
import { AccountingService } from './accounting.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SalonsService } from '../salons/salons.service.js';
import type { NotificationsService } from '../notifications/notifications.service.js';

const period = { from: '2026-09-22T20:30:00.000Z', to: '2026-10-22T20:30:00.000Z' };

function setup() {
  const prisma = {
    stylist: {
      findUnique: vi.fn().mockResolvedValue({ id: 'sty-1', salonId: 'salon-1', displayName: 'مریم', commissionPercent: 40 }),
    },
    stylistExpense: {
      findMany: vi.fn().mockResolvedValue([{ id: 'exp-1', amountToman: 30_000 }]),
      findFirst: vi.fn().mockResolvedValue(null),
      aggregate: vi.fn().mockResolvedValue({ _count: { _all: 1 }, _sum: { amountToman: 30_000 } }),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'exp-new', ...data })),
      update: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    appointment: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'appt-1',
          startAt: new Date(),
          priceToman: 250_000,
          chargedToman: 250_000,
          stylistCommissionPercent: 40,
          tipToman: 0,
          stylistShareToman: 100_000,
          customer: { firstName: 'سارا', lastName: 'احمدی' },
          stylist: { id: 'sty-1', displayName: 'مریم' },
          services: [],
        },
      ]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { stylistShareToman: 100_000 } }),
    },
    stylistPayout: {
      findMany: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amountToman: 0 } }),
    },
  };
  const service = new AccountingService(prisma as unknown as PrismaService, {} as SalonsService, {} as NotificationsService);
  return { prisma, service };
}

describe('Stylist expenses', () => {
  it('only ever lists the signed-in stylist’s own expenses', async () => {
    const { prisma, service } = setup();
    await service.listStylistExpenses('sty-user-1', { ...period, category: 'SUPPLIES', page: 2, pageSize: 10 });
    expect(prisma.stylist.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'sty-user-1' } }));
    const args = prisma.stylistExpense.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ stylistId: 'sty-1', category: 'SUPPLIES' });
    expect(args).toMatchObject({ skip: 10, take: 10 });
  });

  it('files a new expense under the stylist and their salon', async () => {
    const { prisma, service } = setup();
    await service.createStylistExpense('sty-user-1', {
      category: 'TOOLS',
      amountToman: 80_000,
      spentAt: period.from,
      description: '  تعمیر سشوار ',
    });
    expect(prisma.stylistExpense.create.mock.calls[0][0].data).toMatchObject({
      stylistId: 'sty-1',
      salonId: 'salon-1',
      description: 'تعمیر سشوار',
      receiptUrl: null,
    });
  });

  it("can't edit or delete another stylist's expense", async () => {
    const { prisma, service } = setup();
    await expect(service.updateStylistExpense('sty-user-1', 'exp-other', { amountToman: 1 })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.stylistExpense.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'exp-other', stylistId: 'sty-1' } }));
    expect(prisma.stylistExpense.update).not.toHaveBeenCalled();
    await expect(service.removeStylistExpense('sty-user-1', 'exp-other')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.stylistExpense.deleteMany).toHaveBeenCalledWith({ where: { id: 'exp-other', stylistId: 'sty-1' } });
  });

  it('monthly earnings subtract the month’s expenses for net income', async () => {
    const { service } = setup();
    const r = await service.earningsForStylist('sty-user-1', period);
    expect(r.totals).toMatchObject({ shareToman: 100_000, expensesToman: 30_000, netIncomeToman: 70_000 });
    expect(r.expenses).toHaveLength(1);
    // the salon balance is about payouts, not the stylist's own costs
    expect(r.balanceToman).toBe(100_000);
  });
});

describe('Stylist expense DTOs', () => {
  const base = { category: 'SUPPLIES', amountToman: 10_000, spentAt: period.from };
  const errorsFor = async <T extends object>(cls: new () => T, body: object) =>
    (await validate(plainToInstance(cls, body))).map((e) => e.property);

  it('rejects a description of only spaces on create and update', async () => {
    expect(await errorsFor(CreateStylistExpenseDto, { ...base, description: '   ' })).toContain('description');
    expect(await errorsFor(UpdateStylistExpenseDto, { description: ' \t ' })).toContain('description');
  });

  it('trims a real description', async () => {
    const dto = plainToInstance(CreateStylistExpenseDto, { ...base, description: '  رنگ مو ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.description).toBe('رنگ مو');
  });
});

describe('Stylist expense date limit', () => {
  const longAgo = new Date(Date.now() - 500 * 86_400_000).toISOString();

  it('refuses a new expense dated more than about a year back', async () => {
    const { prisma, service } = setup();
    await expect(
      service.createStylistExpense('sty-user-1', { category: 'OTHER', amountToman: 1_000, spentAt: longAgo, description: 'قدیمی' }),
    ).rejects.toThrow('Expense date is too old');
    expect(prisma.stylistExpense.create).not.toHaveBeenCalled();
  });

  it('still lets an older expense be edited when its date stays the same', async () => {
    const { prisma, service } = setup();
    prisma.stylistExpense.findFirst.mockResolvedValue({ id: 'exp-old', spentAt: new Date(longAgo) });
    await service.updateStylistExpense('sty-user-1', 'exp-old', { spentAt: longAgo, amountToman: 2_000 });
    expect(prisma.stylistExpense.update).toHaveBeenCalled();
    await expect(
      service.updateStylistExpense('sty-user-1', 'exp-old', { spentAt: new Date(Date.now() - 600 * 86_400_000).toISOString() }),
    ).rejects.toThrow('Expense date is too old');
  });
});
