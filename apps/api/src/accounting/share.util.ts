/**
 * Splits the money received for an appointment between the stylist (their commission percent,
 * rounded to the nearest toman) and the salon (the rest), so the two always add up exactly.
 */
export function splitCharge(chargedToman: number, commissionPercent: number) {
  const stylistShareToman = Math.round((chargedToman * commissionPercent) / 100);
  return { stylistShareToman, salonShareToman: chargedToman - stylistShareToman };
}

/**
 * The percent a stylist earns on a whole appointment when some services carry their own rate
 * (StylistService.commissionPercent): each service's rate weighted by its price, so a 30,000
 * toman add-on at 70% doesn't outweigh a 500,000 toman colour at 40%. Services with no own rate
 * use the stylist's default. A free appointment falls back to the default.
 */
export function effectiveCommissionPercent(lines: { priceToman: number; commissionPercent: number | null }[], defaultPercent: number) {
  const total = lines.reduce((sum, l) => sum + l.priceToman, 0);
  if (total <= 0) return defaultPercent;
  // Kept unrounded (Float column) so the share on the full price comes out exact to the toman.
  return lines.reduce((sum, l) => sum + l.priceToman * (l.commissionPercent ?? defaultPercent), 0) / total;
}

/** The stylist's whole take for an appointment: their commission on the amount received plus any tip. */
export function stylistTake(chargedToman: number, commissionPercent: number, tipToman: number | null | undefined) {
  return splitCharge(chargedToman, commissionPercent).stylistShareToman + (tipToman ?? 0);
}
