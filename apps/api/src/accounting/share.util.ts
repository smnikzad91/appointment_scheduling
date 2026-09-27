/**
 * Splits the money received for an appointment between the stylist (their commission percent,
 * rounded to the nearest toman) and the salon (the rest), so the two always add up exactly.
 */
export function splitCharge(chargedToman: number, commissionPercent: number) {
  const stylistShareToman = Math.round((chargedToman * commissionPercent) / 100);
  return { stylistShareToman, salonShareToman: chargedToman - stylistShareToman };
}
