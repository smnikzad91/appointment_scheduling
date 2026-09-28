import type { Booking, Salon } from "@/types/salon";
import { SalonApiError, salonApiFetch } from "./salonApiClient";
import { salonWallTimeToInstant } from "@/lib/salonTime";

export async function requestOtp(phone: string): Promise<{ success: true; devCode?: string }> {
  return salonApiFetch("/auth/otp/request", { method: "POST", body: JSON.stringify({ phone }) });
}

/** User-facing message for a failed requestOtp — the api throttles each phone (429). */
export function otpRequestErrorMessage(err: unknown, fallback: string): string {
  return err instanceof SalonApiError && err.status === 429
    ? "درخواست کد بیش از حد مجاز است، لطفاً کمی بعد دوباره تلاش کنید"
    : fallback;
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
  const { salon, serviceIds, stylistId, dateKey, startMinute, accessToken } = input;

  const startAt = salonWallTimeToInstant(dateKey, startMinute, salon.timezone);

  const appointment = await salonApiFetch<RawAppointment>("/appointments", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      salonId: salon.id,
      stylistId: stylistId ?? undefined,
      serviceIds,
      startAt: startAt.toISOString(),
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
