import { splitCharge } from './share.util.js';

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
