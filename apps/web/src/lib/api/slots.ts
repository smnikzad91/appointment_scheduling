import type { Salon, TimeSlot, PartOfDay } from "@/types/salon";
import { salonApiFetch } from "./salonApiClient";

const SLOT_STEP_MINUTES = 30;

export interface GetAvailableSlotsInput {
  salon: Salon;
  stylistId: string | null;
  serviceIds: string[];
  dateKey: string;
}

/** Sums the duration of the selected services (minimum one slot step if empty). */
export function getTotalDurationMinutes(salon: Salon, serviceIds: string[]): number {
  const total = salon.services.filter((s) => serviceIds.includes(s.id)).reduce((sum, s) => sum + s.durationMinutes, 0);
  return total || SLOT_STEP_MINUTES;
}

export async function getAvailableSlots({ salon, stylistId, serviceIds, dateKey }: GetAvailableSlotsInput): Promise<TimeSlot[]> {
  if (serviceIds.length === 0) return [];

  const params = new URLSearchParams({ date: dateKey, serviceIds: serviceIds.join(",") });
  if (stylistId) params.set("stylistId", stylistId);

  return salonApiFetch<TimeSlot[]>(`/salons/${encodeURIComponent(salon.slug)}/availability?${params.toString()}`);
}

export function getPartOfDay(startMinute: number): PartOfDay {
  if (startMinute < 12 * 60) return "morning";
  if (startMinute < 16 * 60) return "noon";
  return "evening";
}

export const PART_OF_DAY_LABEL: Record<PartOfDay, string> = {
  morning: "صبح",
  noon: "ظهر",
  evening: "عصر",
};

export function groupSlotsByPartOfDay(slots: TimeSlot[]): Record<PartOfDay, TimeSlot[]> {
  const groups: Record<PartOfDay, TimeSlot[]> = { morning: [], noon: [], evening: [] };
  for (const slot of slots) {
    groups[getPartOfDay(slot.startMinute)].push(slot);
  }
  return groups;
}
