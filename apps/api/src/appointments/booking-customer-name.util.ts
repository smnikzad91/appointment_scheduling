/**
 * The customer's name as staff see it on one booking: what the salon or stylist set on that booking
 * (Appointment.customerFirstName / customerLastName, edit sheet), each field falling back to the
 * customer's account name. The account itself is never changed by staff.
 */
export function bookingCustomerName(a: {
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customer: { firstName: string; lastName: string };
}): { firstName: string; lastName: string } {
  return {
    firstName: a.customerFirstName ?? a.customer.firstName,
    lastName: a.customerLastName ?? a.customer.lastName,
  };
}

/** "First Last", trimmed. */
export function bookingCustomerFullName(a: Parameters<typeof bookingCustomerName>[0]): string {
  const { firstName, lastName } = bookingCustomerName(a);
  return `${firstName} ${lastName}`.trim();
}

/** A staff-facing appointment row with `customer` showing the booking's name. */
export function withBookingCustomerName<T extends Parameters<typeof bookingCustomerName>[0]>(a: T): T {
  return { ...a, customer: { ...a.customer, ...bookingCustomerName(a) } };
}
