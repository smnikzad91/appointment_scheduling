import { effectiveCommissionPercent, splitCharge, stylistTake } from './share.util.js';

describe('splitCharge', () => {
  it('gives the stylist their percent and the salon the rest', () => {
    expect(splitCharge(350_000, 40)).toEqual({ stylistShareToman: 140_000, salonShareToman: 210_000 });
  });

  it('rounds the stylist share and keeps the total exact', () => {
    const { stylistShareToman, salonShareToman } = splitCharge(99_999, 33);
    expect(stylistShareToman).toBe(33_000);
    expect(stylistShareToman + salonShareToman).toBe(99_999);
  });

  it('handles 0% and 100%', () => {
    expect(splitCharge(500_000, 0)).toEqual({ stylistShareToman: 0, salonShareToman: 500_000 });
    expect(splitCharge(500_000, 100)).toEqual({ stylistShareToman: 500_000, salonShareToman: 0 });
  });
});

describe('effectiveCommissionPercent', () => {
  it('uses the default when no service has its own rate', () => {
    expect(effectiveCommissionPercent([{ priceToman: 300_000, commissionPercent: null }], 40)).toBe(40);
  });

  it('weights each service rate by its price', () => {
    // 500k at 40% + 100k at 70% = 270k of 600k = 45%
    const pct = effectiveCommissionPercent(
      [
        { priceToman: 500_000, commissionPercent: null },
        { priceToman: 100_000, commissionPercent: 70 },
      ],
      40,
    );
    expect(pct).toBe(45);
    expect(splitCharge(600_000, pct).stylistShareToman).toBe(270_000);
  });

  it('keeps the share exact for uneven rates and falls back to the default for a free appointment', () => {
    const pct = effectiveCommissionPercent(
      [
        { priceToman: 200_000, commissionPercent: 50 },
        { priceToman: 100_000, commissionPercent: 0 },
      ],
      40,
    );
    expect(pct).toBeCloseTo(33.333, 3);
    expect(splitCharge(300_000, pct).stylistShareToman).toBe(100_000);
    expect(effectiveCommissionPercent([{ priceToman: 0, commissionPercent: 80 }], 40)).toBe(40);
  });
});

describe('stylistTake', () => {
  it('adds the whole tip to the commission', () => {
    expect(stylistTake(350_000, 40, 50_000)).toBe(190_000);
    expect(stylistTake(350_000, 40, null)).toBe(140_000);
  });
});
