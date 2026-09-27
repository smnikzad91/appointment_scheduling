import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AppointmentStatus } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonsService } from "../salons/salons.service.js";
import { findEligibleStylists } from "../salons/eligible-stylists.util.js";
import { effectiveServicePricing, sumEffectivePricing } from "../salons/service-pricing.util.js";
import { AvailabilityQueryDto } from "./dto/availability-query.dto.js";

const SLOT_STEP_MINUTES = 30;
const ACTIVE_STATUSES: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];

export interface TimeSlot {
  startMinute: number;
  available: boolean;
}

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salonsService: SalonsService,
  ) {}

  async getAvailability(slug: string, query: AvailabilityQueryDto): Promise<TimeSlot[]> {
    const salon = await this.salonsService.findPublicBySlug(slug);
    if (!salon) throw new NotFoundException("Salon not found");

    const services = await this.prisma.service.findMany({
      where: { id: { in: query.serviceIds }, salonId: salon.id, active: true },
    });
    if (services.length !== query.serviceIds.length) {
      throw new BadRequestException("One or more services were not found for this salon");
    }
    const eligible = await findEligibleStylists(this.prisma, salon.id, query.serviceIds);
    const stylists = query.stylistId ? eligible.filter((s) => s.id === query.stylistId) : eligible;
    if (stylists.length === 0) return [];

    // Parsed as UTC midnight — dayOfWeek and minute-of-day math below are UTC-based throughout,
    // matching how startAt/endAt are stored. Revisit once salon.timezone actually varies per salon.
    const dayStart = new Date(`${query.date}T00:00:00.000Z`);
    const dayOfWeek = dayStart.getUTCDay();
    const now = new Date();
    const isToday = query.date === now.toISOString().slice(0, 10);
    const nowMinute = now.getUTCHours() * 60 + now.getUTCMinutes();

    const perStylistSlots = await Promise.all(
      stylists.map((stylist) => {
        const { durationMinutes } = sumEffectivePricing(effectiveServicePricing(services, stylist.services));
        return this.computeStylistSlots(stylist.id, dayOfWeek, dayStart, durationMinutes, isToday, nowMinute);
      }),
    );

    const merged = new Map<number, boolean>();
    for (const slots of perStylistSlots) {
      for (const slot of slots) {
        merged.set(slot.startMinute, (merged.get(slot.startMinute) ?? false) || slot.available);
      }
    }

    return [...merged.entries()]
      .sort(([a], [b]) => a - b)
      .map(([startMinute, available]) => ({ startMinute, available }));
  }

  private async computeStylistSlots(
    stylistId: string,
    dayOfWeek: number,
    dayStart: Date,
    durationMinutes: number,
    isToday: boolean,
    nowMinute: number,
  ): Promise<TimeSlot[]> {
    const hours = await this.prisma.workingHour.findFirst({ where: { stylistId, dayOfWeek } });
    if (!hours) return [];

    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);

    const [timeOff, appointments] = await Promise.all([
      this.prisma.timeOff.findMany({ where: { stylistId, startAt: { lt: dayEnd }, endAt: { gt: dayStart } } }),
      this.prisma.appointment.findMany({
        where: { stylistId, status: { in: ACTIVE_STATUSES }, startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
      }),
    ]);

    const slots: TimeSlot[] = [];
    for (let start = hours.startMinute; start + durationMinutes <= hours.endMinute; start += SLOT_STEP_MINUTES) {
      const end = start + durationMinutes;
      const slotStart = new Date(dayStart.getTime() + start * 60_000);
      const slotEnd = new Date(dayStart.getTime() + end * 60_000);

      const blockedByTimeOff = timeOff.some((t) => slotStart < t.endAt && slotEnd > t.startAt);
      const blockedByAppointment = appointments.some((a) => start < minutesSince(dayStart, a.endAt) && end > minutesSince(dayStart, a.startAt));
      const isPast = isToday && start <= nowMinute;

      slots.push({ startMinute: start, available: !blockedByTimeOff && !blockedByAppointment && !isPast });
    }

    return slots;
  }
}

function minutesSince(dayStart: Date, date: Date): number {
  return Math.round((date.getTime() - dayStart.getTime()) / 60_000);
}
