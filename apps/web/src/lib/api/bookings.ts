import type { Booking, Salon } from "@/types/salon";
import type { ServiceLocation } from "@/lib/independent";
import { salonApiFetch } from "./salonApiClient";
import { salonWallTimeToInstant } from "@/lib/salonTime";

/** `purpose: "register"` = confirming the phone of an account about to be created (refused if taken). */
export async function requestOtp(phone: string, purpose?: "register"): Promise<{ success: true; devCode?: string }> {
  return salonApiFetch("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone, ...(purpose && { purpose }) }) });
}

export interface VerifyOtpResult {
  accessToken: string;
  user: { id: string; firstName: string; lastName: string };
}

export async function verifyOtp(
  phone: string,
  code: string,
  name?: { firstName: string; lastName: string },
): Promise<VerifyOtpResult> {
  return salonApiFetch("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code, firstName: name?.firstName, lastName: name?.lastName }),
  });
}

export interface CreateBookingInput {
  salon: Salon;
  serviceIds: string[];
  stylistId: string | null;
  dateKey: string;
  startMinute: number;
  accessToken: string;
  /** Independent stylists only. */
  serviceLocation?: ServiceLocation | null;
  visitAddress?: string;
}

interface RawAppointment {
  id: string;
  salonId: string;
  stylistId: string;
  startAt: string;
  endAt: string;
  priceToman: number;
  status: string;
  services: { serviceId: string }[];
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { salon, serviceIds, stylistId, dateKey, startMinute, accessToken, serviceLocation, visitAddress } = input;

  const startAt = salonWallTimeToInstant(dateKey, startMinute, salon.timezone);

  const appointment = await salonApiFetch<RawAppointment>("/appointments", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      salonId: salon.id,
      stylistId: stylistId ?? undefined,
      serviceIds,
      startAt: startAt.toISOString(),
      ...(serviceLocation && { serviceLocation }),
      ...(serviceLocation === "CLIENT_HOME" && visitAddress && { visitAddress }),
    }),
  });

  const durationMinutes = Math.round((new Date(appointment.endAt).getTime() - startAt.getTime()) / 60_000);
  const endMinute = startMinute + durationMinutes;

  return {
    id: appointment.id,
    salonId: appointment.salonId,
    serviceIds: appointment.services.map((s) => s.serviceId),
    stylistId: appointment.stylistId,
    date: dateKey,
    startMinute,
    endMinute,
    totalPriceToman: appointment.priceToman,
    status: appointment.status.toLowerCase() as Booking["status"],
    createdAt: new Date().toISOString(),
  };
}
