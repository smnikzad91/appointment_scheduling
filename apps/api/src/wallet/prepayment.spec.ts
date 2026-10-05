import { applyPrepayment, prepaymentFor, prepaymentStateFor, stylistShareOfPrepayment, takePrepayment, InsufficientWalletError } from './prepayment.js';

// A fake transaction: wallets in a map, the conditional UPDATE emulated from the SQL's parameters.
function fakeTx(wallets: Record<string, number>, prepaymentStatus: string | null = 'HELD') {
  const ledger: { userId: string; kind: string; amountToman: number; balanceAfter: number }[] = [];
  const state: { prepaymentStatus: string | null; prepaymentStylistToman?: number } = { prepaymentStatus };
  const payouts: { appointmentId: string; amountToman: number; method: string }[] = [];
  const tx = {
    $queryRaw: vi.fn((strings: TemplateStringsArray, amount: number, userId: string, guard: { values?: number[] }) => {
      const min = guard?.values?.[0];
      if (min !== undefined && wallets[userId] < min) return Promise.resolve([]);
      wallets[userId] += amount;
      return Promise.resolve([{ walletBalance: wallets[userId] }]);
    }),
    walletTransaction: { create: vi.fn(({ data }) => { ledger.push(data); return Promise.resolve(data); }) },
    user: { findUnique: vi.fn(({ where }) => Promise.resolve({ walletBalance: wallets[where.id] })) },
    appointment: {
      updateMany: vi.fn(({ where, data }) => {
        if (state.prepaymentStatus !== where.prepaymentStatus) return Promise.resolve({ count: 0 });
        Object.assign(state, data);
        return Promise.resolve({ count: 1 });
      }),
    },
    stylistPayout: {
      create: vi.fn(({ data }) => { payouts.push(data); return Promise.resolve({ id: 'p1', ...data }); }),
      deleteMany: vi.fn(({ where }) => { payouts.splice(0, payouts.length, ...payouts.filter((p) => p.appointmentId !== where.appointmentId)); return Promise.resolve({ count: 1 }); }),
    },
  };
  return { tx: tx as never, ledger, state, payouts };
}

const appt = (prepaymentStatus: 'HELD' | 'SETTLED' | 'REFUNDED', extra: { stylistUserId?: string; prepaymentStylistToman?: number } = {}) => ({
  id: 'a1', salonId: 's1', customerId: 'cust', ownerId: 'owner', stylistId: 'st1', stylistUserId: 'owner', prepaidToman: 50_000, prepaymentStylistToman: 0, prepaymentStatus, ...extra,
});

describe('booking pre-payment', () => {
  it('is half the price, rounded up to a whole toman', () => {
    expect(prepaymentFor(100_000)).toBe(50_000);
    expect(prepaymentFor(75_001)).toBe(37_501);
    expect(prepaymentFor(0)).toBe(0);
  });

  it('maps statuses to where the money sits', () => {
    expect(prepaymentStateFor('PENDING' as never)).toBe('HELD');
    expect(prepaymentStateFor('CONFIRMED' as never)).toBe('HELD');
    expect(prepaymentStateFor('CANCELLED' as never)).toBe('REFUNDED');
    expect(prepaymentStateFor('COMPLETED' as never)).toBe('SETTLED');
    expect(prepaymentStateFor('NO_SHOW' as never)).toBe('SETTLED');
  });

  it('takes it from the wallet, or refuses with what is needed', async () => {
    const wallets = { cust: 60_000 };
    const { tx, ledger } = fakeTx(wallets);
    await takePrepayment(tx, 'cust', 'a1', 50_000);
    expect(wallets.cust).toBe(10_000);
    expect(ledger).toEqual([expect.objectContaining({ userId: 'cust', kind: 'PREPAYMENT', amountToman: -50_000, balanceAfter: 10_000 })]);

    const err = await takePrepayment(tx, 'cust', 'a2', 50_000).catch((e) => e);
    expect(err).toBeInstanceOf(InsufficientWalletError);
    expect(err.getResponse()).toMatchObject({ prepaymentToman: 50_000, balanceToman: 10_000 });
    expect(wallets.cust).toBe(10_000);
  });

  it('refunds the customer on cancellation', async () => {
    const wallets = { cust: 0, owner: 0 };
    const { tx, state } = fakeTx(wallets);
    await applyPrepayment(tx, appt('HELD'), 'CANCELLED' as never);
    expect(wallets).toEqual({ cust: 50_000, owner: 0 });
    expect(state.prepaymentStatus).toBe('REFUNDED');
  });

  it('pays the owner on completion or no-show, and takes it back if that is undone', async () => {
    const wallets = { cust: 0, owner: 0 };
    const { tx, state } = fakeTx(wallets);
    await applyPrepayment(tx, appt('HELD'), 'COMPLETED' as never);
    expect(wallets).toEqual({ cust: 0, owner: 50_000 });
    // completed by mistake, then cancelled: the owner gives it back (even below zero), the customer gets it
    wallets.owner = 20_000;
    await applyPrepayment(tx, appt('SETTLED'), 'CANCELLED' as never);
    expect(wallets).toEqual({ cust: 50_000, owner: -30_000 });
    expect(state.prepaymentStatus).toBe('REFUNDED');
  });

  it('moves nothing when the status keeps it where it is, and never twice in a race', async () => {
    const wallets = { cust: 0, owner: 0 };
    const { tx } = fakeTx(wallets, 'SETTLED'); // someone else already settled it
    await applyPrepayment(tx, appt('HELD'), 'CONFIRMED' as never);
    expect(wallets).toEqual({ cust: 0, owner: 0 });
    await expect(applyPrepayment(tx, appt('HELD'), 'COMPLETED' as never)).rejects.toThrow('just changed');
    expect(wallets).toEqual({ cust: 0, owner: 0 });
  });

  it("won't reopen a refunded booking", async () => {
    const { tx } = fakeTx({ cust: 0, owner: 0 }, 'REFUNDED');
    await expect(applyPrepayment(tx, appt('REFUNDED'), 'CONFIRMED' as never)).rejects.toThrow("can't be reopened");
  });
});

describe("a salon stylist's share of the pre-payment", () => {
  it('is their commission percent of it, rounded down', () => {
    expect(stylistShareOfPrepayment(50_000, 30)).toBe(15_000);
    expect(stylistShareOfPrepayment(33_333, 12.5)).toBe(4166);
    expect(stylistShareOfPrepayment(50_000, 0)).toBe(0);
  });

  it('goes to the stylist as a wallet payout on completion; the owner gets the rest', async () => {
    const wallets = { cust: 0, owner: 0, sty: 0 };
    const { tx, payouts, state, ledger } = fakeTx(wallets);
    await applyPrepayment(tx, appt('HELD', { stylistUserId: 'sty' }), 'COMPLETED' as never, 30);
    expect(wallets).toEqual({ cust: 0, owner: 35_000, sty: 15_000 });
    expect(payouts).toEqual([expect.objectContaining({ appointmentId: 'a1', amountToman: 15_000, method: 'WALLET' })]);
    expect(state).toMatchObject({ prepaymentStatus: 'SETTLED', prepaymentStylistToman: 15_000 });
    expect(ledger.find((l) => l.userId === 'sty')).toMatchObject({ kind: 'PREPAYMENT_INCOME', payoutId: 'p1' });
  });

  it('no-show: all of it to the owner', async () => {
    const wallets = { cust: 0, owner: 0, sty: 0 };
    const { tx, payouts } = fakeTx(wallets);
    await applyPrepayment(tx, appt('HELD', { stylistUserId: 'sty' }), 'NO_SHOW' as never, 30);
    expect(wallets).toEqual({ cust: 0, owner: 50_000, sty: 0 });
    expect(payouts).toEqual([]);
  });

  it('undoing the completion takes both parts back and removes the payout', async () => {
    const wallets = { cust: 0, owner: 35_000, sty: 15_000 };
    const { tx, payouts } = fakeTx(wallets, 'SETTLED');
    payouts.push({ appointmentId: 'a1', amountToman: 15_000, method: 'WALLET' });
    await applyPrepayment(tx, appt('SETTLED', { stylistUserId: 'sty', prepaymentStylistToman: 15_000 }), 'CANCELLED' as never);
    expect(wallets).toEqual({ cust: 50_000, owner: 0, sty: 0 });
    expect(payouts).toEqual([]);
  });
});
