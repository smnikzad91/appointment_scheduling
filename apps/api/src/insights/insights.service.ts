import { Injectable } from "@nestjs/common";
import { AppointmentStatus, Prisma } from "@appointment-scheduling/database";
import { PrismaService } from "../prisma/prisma.service.js";
import { SalonsService } from "../salons/salons.service.js";
import { addDaysToDateKey, instantToSalonWallTime, salonWallTimeToInstant } from "../availability/salon-time.util.js";
import { computeCustomerInsights, windowStart, type InsightStatus } from "./customer-insights.js";

/** Visit windows: page_visits rows are kept 120 days (apps/web lib/analytics), so at most 90. */
export const VISIT_RANGES = [7, 30, 90] as const;
export const CUSTOMER_RANGES = [30, 90, 365] as const;
/** «Online now»: distinct visitors of the last few minutes. */
const LIVE_MINUTES = 30;
const DAY_MS = 86_400_000;

const num = (v: bigint | number | null | undefined) => Number(v ?? 0);
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
/** Bookings per 100 visitors; capped since app bookings and repeat bookers aren't page visitors. */
const conversion = (bookings: number, visitors: number) => Math.min(100, pct(bookings, visitors));

/**
 * The salon owner's (or independent stylist's) analytics:
 * - visits: their public page /s/<slug> from the site analytics (page_visits — written by apps/web's
 *   /api/visit beacon; IPs never stored, a visitor is a salted hash of IP + browser): views, unique
 *   visitors, daily trend, referrers, devices, the booking funnel and visits → booking conversion.
 * - customers: their past appointments (customer-insights.ts).
 */
@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salons: SalonsService,
  ) {}

  private start(now: Date, days: number, timeZone: string) {
    return windowStart(now, days, timeZone, (dateKey) => salonWallTimeToInstant(dateKey, 0, timeZone));
  }

  async visitsForOwner(userId: string, days: number, now = new Date()) {
    const salon = await this.salons.findMine(userId);
    const tz = salon.timezone;
    const from = this.start(now, days, tz);
    const prevFrom = new Date(from.getTime() - days * DAY_MS);
    const todayFrom = this.start(now, 1, tz);
    const own = Prisma.sql`"salonSlug" = ${salon.slug}`;
    const views = (a: Date, b: Date) => Prisma.sql`${own} AND kind = 'VIEW' AND "createdAt" >= ${a} AND "createdAt" < ${b}`;
    type Breakdown = { key: string | null; views: bigint; visitors: bigint };
    const breakdown = (col: Prisma.Sql) => this.prisma.$queryRaw<Breakdown[]>`
      SELECT ${col} AS key, count(*) AS views, count(DISTINCT "visitorHash") AS visitors
      FROM page_visits WHERE ${views(from, now)} GROUP BY 1 ORDER BY 3 DESC, 2 DESC LIMIT 8`;
    const totals = (a: Date, b: Date) => this.prisma.$queryRaw<{ views: bigint; visitors: bigint }[]>`
      SELECT count(*) AS views, count(DISTINCT "visitorHash") AS visitors FROM page_visits WHERE ${views(a, b)}`;

    const [current, previous, today, live, perDay, referrers, devices, events] = await Promise.all([
      totals(from, now),
      totals(prevFrom, from),
      totals(todayFrom, now),
      totals(new Date(now.getTime() - LIVE_MINUTES * 60_000), now),
      this.prisma.$queryRaw<{ day: string; views: bigint; visitors: bigint }[]>`
        SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day,
               count(*) AS views, count(DISTINCT "visitorHash") AS visitors
        FROM page_visits WHERE ${views(from, now)} GROUP BY 1 ORDER BY 1`,
      // nobatet = came from another page of this site (search, city pages, the home page)
      breakdown(Prisma.sql`CASE "referrerType" WHEN 'direct' THEN 'direct' WHEN 'internal' THEN 'nobatet'
        ELSE coalesce("referrerSource", "referrerType") END`),
      breakdown(Prisma.sql`device`),
      this.events(salon.slug, from, now),
    ]);
    // Bookings come from the appointments table, not the page's «booking done» beacon, which some
    // browsers and blockers drop (it under-counted by a quarter at one salon).
    const [onlineBookings, prevOnlineBookings] = await Promise.all([
      this.onlineBookings(salon.id, from, now),
      this.onlineBookings(salon.id, prevFrom, from),
    ]);

    const byDay = new Map(perDay.map((d) => [d.day, d]));
    const firstKey = instantToSalonWallTime(from, tz).dateKey;
    const daysList = Array.from({ length: days }, (_, i) => {
      const day = addDaysToDateKey(firstKey, i);
      const row = byDay.get(day);
      return { day, views: num(row?.views), visitors: num(row?.visitors) };
    });
    const visitors = num(current[0]?.visitors);
    const prevVisitors = num(previous[0]?.visitors);
    const list = (rows: Breakdown[]) => rows.map((r) => ({ key: r.key ?? "unknown", views: num(r.views), visitors: num(r.visitors) }));

    return {
      slug: salon.slug,
      days,
      from: from.toISOString(),
      to: now.toISOString(),
      totals: { views: num(current[0]?.views), visitors },
      previous: { views: num(previous[0]?.views), visitors: prevVisitors, onlineBookings: prevOnlineBookings, conversion: conversion(prevOnlineBookings, prevVisitors) },
      today: { views: num(today[0]?.views), visitors: num(today[0]?.visitors) },
      liveVisitors: num(live[0]?.visitors),
      liveMinutes: LIVE_MINUTES,
      perDay: daysList,
      referrers: list(referrers),
      devices: list(devices),
      funnel: events,
      /** customers' own bookings made in the window (site or app) */
      onlineBookings,
      /** online bookings ÷ unique visitors, at most 100 */
      conversion: conversion(onlineBookings, visitors),
    };
  }

  private onlineBookings(salonId: string, from: Date, to: Date) {
    return this.prisma.appointment.count({ where: { salonId, bookedOnline: true, createdAt: { gte: from, lt: to } } });
  }

  private async events(slug: string, from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<{ kind: string; count: bigint; visitors: bigint }[]>`
      SELECT kind::text AS kind, count(*) AS count, count(DISTINCT "visitorHash") AS visitors FROM page_visits
      WHERE "salonSlug" = ${slug} AND kind IN ('BOOKING_OPEN', 'BOOKING_DONE') AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1`;
    const of = (k: string) => rows.find((r) => r.kind === k);
    return {
      opened: num(of("BOOKING_OPEN")?.count),
      openedVisitors: num(of("BOOKING_OPEN")?.visitors),
      done: num(of("BOOKING_DONE")?.count),
      doneVisitors: num(of("BOOKING_DONE")?.visitors),
    };
  }

  async customersForOwner(userId: string, days: number, now = new Date()) {
    const salon = await this.salons.findMine(userId);
    const from = this.start(now, days, salon.timezone);
    // the cohort table looks back 6 Jalali months plus the 90 days a return can take
    const cohortFrom = new Date(now.getTime() - 7 * 31 * DAY_MS);

    const rows = await this.prisma.appointment.findMany({
      where: { salonId: salon.id, startAt: { gte: from, lt: now } },
      select: {
        customerId: true,
        customerFirstName: true,
        customerLastName: true,
        startAt: true,
        createdAt: true,
        status: true,
        priceToman: true,
        chargedToman: true,
        customer: { select: { firstName: true, lastName: true } },
        services: { select: { serviceId: true, priceToman: true, service: { select: { name: true } } } },
      },
    });
    const customerIds = [...new Set(rows.map((r) => r.customerId))];
    const [firstVisits, cohortVisits, firstCompleted] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ["customerId"],
        where: { salonId: salon.id, customerId: { in: customerIds }, status: { not: AppointmentStatus.CANCELLED } },
        _min: { startAt: true },
      }),
      this.prisma.appointment.findMany({
        where: { salonId: salon.id, status: AppointmentStatus.COMPLETED, startAt: { gte: cohortFrom, lt: now } },
        select: { customerId: true, startAt: true },
      }),
      this.prisma.appointment.groupBy({
        by: ["customerId"],
        where: { salonId: salon.id, status: AppointmentStatus.COMPLETED, startAt: { lt: now } },
        _min: { startAt: true },
        having: { startAt: { _min: { gte: cohortFrom } } },
      }),
    ]);

    return computeCustomerInsights({
      appointments: rows.map((r) => ({
        customerId: r.customerId,
        customerName:
          [r.customerFirstName ?? r.customer.firstName, r.customerFirstName ? r.customerLastName : r.customer.lastName].filter(Boolean).join(" ") || "مشتری",
        startAt: r.startAt,
        createdAt: r.createdAt,
        status: r.status as InsightStatus,
        priceToman: r.priceToman,
        chargedToman: r.chargedToman,
        services: r.services.map((s) => ({ serviceId: s.serviceId, name: s.service.name, priceToman: s.priceToman })),
      })),
      firstVisitAt: new Map(firstVisits.map((f) => [f.customerId, f._min.startAt!])),
      cohortVisits,
      firstCompletedAt: new Map(firstCompleted.map((f) => [f.customerId, f._min.startAt!])),
      timeZone: salon.timezone,
      from,
      now,
    });
  }
}
