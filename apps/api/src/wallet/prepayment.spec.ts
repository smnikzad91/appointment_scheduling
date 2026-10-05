import { applyPrepayment, prepaymentFor, prepaymentStateFor, takePrepayment, InsufficientWalletError } from './prepayment.js';

// A fake transaction: wallets in a map, the conditional UPDATE emulated from the SQL's parameters.
function fakeTx(wallets: Record<string, number>, prepaymentStatus: string | null = 'HELD') {
  const ledger: { userId: string; kind: string; amountToman: number; balanceAfter: number }[] = [];
  const state = { prepaymentStatus };
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
        state.prepaymentStatus = data.prepaymentStatus;
        return Promise.resolve({ count: 1 });
      }),
    },
  };
  return { tx: tx as never, ledger, state };
}

const appt = (prepaymentStatus: 'HELD' | 'SETTLED' | 'REFUNDED') => ({ id: 'a1', customerId: 'cust', ownerId: 'owner', prepaidToman: 50_000, prepaymentStatus });

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
