import { Injectable } from "@nestjs/common";
import { AppointmentStatus, Prisma } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { withBookingCustomerName } from "./booking-customer-name.util.js";
import { AdminAppointmentsQueryDto } from "./dto/admin-appointments-query.dto.js";

export const ADMIN_PAGE_SIZE = 50;

/** «علي ۰۹۱۲» → «علی 0912»: what admins type vs. what's stored. */
function normalizeQuery(q: string): string {
  return q
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .trim();
}

/**
 * Every booking on the platform for the platform admin (/admin/appointments in apps/web): newest
 * start first, 50 a page, with salon, stylist, customer (as staff see them — the booking's own name),
 * services, money and pre-payment. Counts per status for the same filters, for the tabs.
 */
@Injectable()
export class AdminAppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminAppointmentsQueryDto) {
    const page = query.page ?? 1;
    const where: Prisma.AppointmentWhereInput = {
      ...(query.salonId && { salonId: query.salonId }),
      ...((query.from || query.to) && {
        startAt: { ...(query.from && { gte: new Date(query.from) }), ...(query.to && { lt: new Date(query.to) }) },
      }),
    };
    const q = query.q ? normalizeQuery(query.q) : "";
    if (q) {
      const words = q.split(/\s+/).filter(Boolean).slice(0, 5);
      // every word must match somewhere
      where.AND = words.map((w) => {
        const has = { contains: w, mode: "insensitive" as const };
        const phone = w.replace(/^\+?98/, "0");
        return {
          OR: [
            { customerFirstName: has },
            { customerLastName: has },
            { customer: { firstName: has } },
            { customer: { lastName: has } },
            { customer: { phone: { contains: phone } } },
            { salon: { name: has } },
            { stylist: { displayName: has } },
          ],
        };
      });
    }

    const [items, total, byStatus] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { ...where, ...(query.status && { status: query.status as AppointmentStatus }) },
        orderBy: { startAt: "desc" },
        skip: (page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE,
        include: {
          salon: { select: { id: true, name: true, slug: true, kind: true, timezone: true, hostSalonName: true } },
          stylist: { select: { id: true, displayName: true } },
          // never the whole User row (passwordHash)
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
          services: { select: { priceToman: true, durationMinutes: true, service: { select: { name: true } } } },
          reviews: { select: { target: true, rating: true, status: true } },
        },
      }),
      this.prisma.appointment.count({ where: { ...where, ...(query.status && { status: query.status as AppointmentStatus }) } }),
      this.prisma.appointment.groupBy({ by: ["status"], where, _count: { _all: true } }),
    ]);

    return {
      page,
      pageSize: ADMIN_PAGE_SIZE,
      total,
      counts: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
      items: items.map((a) => {
        const named = withBookingCustomerName(a);
        return {
          id: a.id,
          status: a.status,
          startAt: a.startAt,
          endAt: a.endAt,
          createdAt: a.createdAt,
          priceToman: a.priceToman,
          chargedToman: a.chargedToman,
          tipToman: a.tipToman,
          stylistShareToman: a.stylistShareToman,
          prepaidToman: a.prepaidToman,
          prepaymentStatus: a.prepaymentStatus,
          prepaymentStylistToman: a.prepaymentStylistToman,
          balanceMethod: a.balanceMethod,
          balanceDueToman: a.balanceDueToman,
          balancePaidAt: a.balancePaidAt,
          notes: a.notes,
          serviceLocation: a.serviceLocation,
          visitAddress: a.visitAddress,
          salon: a.salon,
          stylist: a.stylist,
          customer: named.customer,
          services: a.services.map((s) => ({ name: s.service.name, priceToman: s.priceToman, durationMinutes: s.durationMinutes })),
          reviews: a.reviews,
        };
      }),
    };
  }
}
