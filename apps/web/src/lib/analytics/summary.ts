import { Prisma } from "@appointment-scheduling/database";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Everything /admin/analytics shows for one [from, to) window, in one round of parallel queries.
// Days are Tehran days.

type Row = { key: string | null; views: bigint; visitors: bigint };
const num = (v: bigint | number | null | undefined) => Number(v ?? 0);

export async function analyticsSummary(from: Date, to: Date) {
  const inRange = Prisma.sql`"createdAt" >= ${from} AND "createdAt" < ${to}`;
  const views = Prisma.sql`${inRange} AND kind = 'VIEW'`;
  const breakdown = (col: Prisma.Sql, where = views, limit = 10) =>
    prisma.$queryRaw<Row[]>`SELECT ${col} AS key, count(*) AS views, count(DISTINCT "visitorHash") AS visitors
      FROM page_visits WHERE ${where} GROUP BY 1 ORDER BY 2 DESC LIMIT ${limit}`;

  const [totals, perDay, pages, salons, referrers, devices, browsers, oses, countries, cities, events, downloads] = await Promise.all([
    prisma.$queryRaw<{ views: bigint; visitors: bigint }[]>`SELECT count(*) AS views, count(DISTINCT "visitorHash") AS visitors FROM page_visits WHERE ${views}`,
    prisma.$queryRaw<{ day: string; views: bigint; visitors: bigint }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Tehran', 'YYYY-MM-DD') AS day,
             count(*) AS views, count(DISTINCT "visitorHash") AS visitors
      FROM page_visits WHERE ${views} GROUP BY 1 ORDER BY 1`,
    breakdown(Prisma.sql`path`, views, 15),
    breakdown(Prisma.sql`"salonSlug"`, Prisma.sql`${views} AND "salonSlug" IS NOT NULL`, 10),
    breakdown(Prisma.sql`CASE WHEN "referrerType" IN ('direct', 'internal') THEN "referrerType" ELSE coalesce("referrerSource", "referrerType") END`, Prisma.sql`${views} AND "referrerType" <> 'internal'`, 10),
    breakdown(Prisma.sql`device`),
    breakdown(Prisma.sql`browser`),
    breakdown(Prisma.sql`os`),
    breakdown(Prisma.sql`country`),
    breakdown(Prisma.sql`city`, views, 10),
    prisma.$queryRaw<{ kind: string; count: bigint; visitors: bigint }[]>`
      SELECT kind::text AS kind, count(*) AS count, count(DISTINCT "visitorHash") AS visitors
      FROM page_visits WHERE ${inRange} AND kind IN ('BOOKING_OPEN', 'BOOKING_DONE') GROUP BY 1`,
    prisma.$queryRaw<{ source: string; count: bigint }[]>`
      SELECT "referrerType" AS source, count(*) AS count FROM page_visits WHERE ${inRange} AND kind = 'DOWNLOAD' GROUP BY 1`,
  ]);

  // salon names for the slugs
  const slugs = salons.map((s) => s.key).filter((s): s is string => !!s);
  const names = new Map(
    (await prisma.salon.findMany({ where: { slug: { in: slugs } }, select: { slug: true, name: true } })).map((s) => [s.slug, s.name]),
  );
  const list = (rows: Row[]) => rows.map((r) => ({ key: r.key ?? "Unknown", views: num(r.views), visitors: num(r.visitors) }));
  const event = (k: string) => events.find((e) => e.kind === k);

  return {
    totals: { views: num(totals[0]?.views), visitors: num(totals[0]?.visitors) },
    perDay: perDay.map((d) => ({ day: d.day, views: num(d.views), visitors: num(d.visitors) })),
    pages: list(pages),
    salons: list(salons).map((s) => ({ ...s, name: names.get(s.key) ?? s.key })),
    referrers: list(referrers),
    devices: list(devices),
    browsers: list(browsers),
    oses: list(oses),
    countries: list(countries),
    cities: list(cities),
    booking: {
      opened: num(event("BOOKING_OPEN")?.count),
      openedVisitors: num(event("BOOKING_OPEN")?.visitors),
      done: num(event("BOOKING_DONE")?.count),
      doneVisitors: num(event("BOOKING_DONE")?.visitors),
    },
    downloads: {
      website: num(downloads.find((d) => d.source === "website")?.count),
      app: num(downloads.find((d) => d.source === "app")?.count),
    },
  };
}

export type AnalyticsSummary = Awaited<ReturnType<typeof analyticsSummary>>;

/** ?from=&to= (ISO instants, [from, to)) — the window chosen on /admin/analytics; default the last 30 days. */
export function parseWindow(req: NextRequest): { from: Date; to: Date } {
  const to = new Date(req.nextUrl.searchParams.get("to") ?? Date.now());
  const from = new Date(req.nextUrl.searchParams.get("from") ?? to.getTime() - 30 * 86_400_000);
  const ok = (d: Date) => !Number.isNaN(d.getTime());
  return ok(from) && ok(to) && from < to ? { from, to } : { from: new Date(Date.now() - 30 * 86_400_000), to: new Date() };
}
