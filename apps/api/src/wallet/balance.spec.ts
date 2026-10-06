import { balanceDue, balanceOnCompletion, payBalance, undoBalance } from './balance.js';
import { balanceRequestText, smsParts } from '../sms/sms.text.js';

function fakeTx(wallets: Record<string, number>, appt: Record<string, unknown>) {
  const state = { ...appt };
  const payouts: { id: string; amountToman: number }[] = [];
  const tx = {
    $queryRaw: vi.fn((_s: TemplateStringsArray, amount: number, userId: string, guard: { values?: number[] }) => {
      const min = guard?.values?.[0];
      if (min !== undefined && wallets[userId] < min) return Promise.resolve([]);
      wallets[userId] += amount;
      return Promise.resolve([{ walletBalance: wallets[userId] }]);
    }),
    walletTransaction: { create: vi.fn() },
    user: { findUnique: vi.fn(({ where }) => Promise.resolve({ walletBalance: wallets[where.id] })) },
    stylistPayout: {
      create: vi.fn(({ data }) => { const p = { id: 'po1', ...data }; payouts.push(p); return Promise.resolve(p); }),
      deleteMany: vi.fn(({ where }) => { payouts.splice(0, payouts.length, ...payouts.filter((p) => p.id !== where.id)); return Promise.resolve({ count: 1 }); }),
    },
    appointment: {
      findUnique: vi.fn(() => Promise.resolve(state)),
      updateMany: vi.fn(({ where, data }) => {
        if ('balancePaidAt' in where && state.balancePaidAt !== where.balancePaidAt) return Promise.resolve({ count: 0 });
        Object.assign(state, data);
        return Promise.resolve({ count: 1 });
      }),
      update: vi.fn(({ data }) => { Object.assign(state, data); return Promise.resolve(state); }),
    },
  };
  return { tx: tx as never, state, payouts };
}

const completed = (over: Record<string, unknown> = {}) => ({
  id: 'a1', customerId: 'cust', salonId: 's1', stylistId: 'st1', status: 'COMPLETED', balanceMethod: 'WALLET',
  balanceDueToman: 190_000, balancePaidAt: null, balanceStylistToman: 0, balancePayoutId: null, stylistCommissionPercent: 30,
  salon: { ownerId: 'owner' }, stylist: { userId: 'sty' }, ...over,
});

describe('the rest of a booking, from the customer\'s wallet', () => {
  it('is the price (or corrected charge) minus the pre-payment', () => {
    expect(balanceDue({ priceToman: 380_000, prepaidToman: 190_000 })).toBe(190_000);
    expect(balanceDue({ priceToman: 380_000, chargedToman: 300_000, prepaidToman: 190_000 })).toBe(110_000);
    expect(balanceDue({ priceToman: 100_000, chargedToman: 50_000, prepaidToman: 190_000 })).toBe(0);
    expect(balanceOnCompletion({ priceToman: 380_000, prepaidToman: 190_000 }, 'WALLET' as never)).toEqual({ balanceMethod: 'WALLET', balanceDueToman: 190_000 });
    expect(balanceOnCompletion({ priceToman: 380_000, prepaidToman: 190_000 }, undefined)).toEqual({ balanceMethod: 'ON_SITE', balanceDueToman: 0 });
    expect(balanceOnCompletion({ priceToman: 0, prepaidToman: 0 }, 'WALLET' as never)).toEqual({ balanceMethod: null, balanceDueToman: 0 });
  });

  it('paid by the customer: stylist commission share to them as a payout, the rest to the owner, once', async () => {
    const wallets = { cust: 200_000, owner: 0, sty: 0 };
    const { tx, state, payouts } = fakeTx(wallets, completed());
    const res = await payBalance(tx, 'cust', 'a1');
    expect(res).toMatchObject({ paidToman: 190_000, stylistPart: 57_000 });
    expect(wallets).toEqual({ cust: 10_000, owner: 133_000, sty: 57_000 });
    expect(payouts).toHaveLength(1);
    expect(state).toMatchObject({ balanceStylistToman: 57_000, balancePayoutId: 'po1' });
    await expect(payBalance(tx, 'cust', 'a1')).rejects.toThrow('Already paid');
  });

  it('not enough in the wallet: 402 with what is needed', async () => {
    const { tx } = fakeTx({ cust: 50_000, owner: 0, sty: 0 }, completed());
    const err = await payBalance(tx, 'cust', 'a1').catch((e) => e);
    expect(err.getStatus()).toBe(402);
  });

  it('only the booking\'s own customer, and only a wallet request', async () => {
    await expect(payBalance(fakeTx({ x: 1e6 }, completed()).tx, 'other', 'a1')).rejects.toThrow('not found');
    await expect(payBalance(fakeTx({ cust: 1e6 }, completed({ balanceMethod: 'ON_SITE' })).tx, 'cust', 'a1')).rejects.toThrow('Nothing to pay');
  });

  it('undoing the completion gives a paid balance back to the customer', async () => {
    const wallets = { cust: 10_000, owner: 133_000, sty: 57_000 };
    const paidAt = new Date();
    const { tx, payouts } = fakeTx(wallets, completed({ balancePaidAt: paidAt, balanceStylistToman: 57_000, balancePayoutId: 'po1' }));
    payouts.push({ id: 'po1', amountToman: 57_000 });
    await undoBalance(tx, completed({ balancePaidAt: paidAt, balanceStylistToman: 57_000, balancePayoutId: 'po1' }) as never, 'owner', 'sty');
    expect(wallets).toEqual({ cust: 200_000, owner: 0, sty: 0 });
    expect(payouts).toEqual([]);
  });

  it('the request SMS fits one segment', () => {
    expect(smsParts(balanceRequestText({ amount: '۱٬۹۰۰٬۰۰۰', salon: 'سالن زیبایی رز سفید شمال تهران' }))).toBe(1);
  });
});
