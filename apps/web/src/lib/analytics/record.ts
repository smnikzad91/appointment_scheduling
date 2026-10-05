import { createHash } from "node:crypto";
import type { VisitKind } from "@appointment-scheduling/database";
import { prisma } from "@/lib/prisma";
import { classifyReferrer, isBot, parseUserAgent, salonSlugOf, type ReferrerType } from "./parse";

// Writes one PageVisit (POST /api/visit from the browser; the APK download route). Never throws and
// never stores the IP: visitorHash = sha256(salt | ip | user agent) — enough to count unique visitors.

const VISITOR_SALT = "nobatet-visit-2026";
export const VISIT_RETENTION_DAYS = 120;

export interface VisitInput {
  kind: VisitKind;
  path: string;
  referrer?: string | null;
  /** DOWNLOAD only: "website" | "app" */
  referrerType?: ReferrerType | "website" | "app";
  salonSlug?: string | null;
  headers: Headers;
}

export async function recordVisit(input: VisitInput): Promise<boolean> {
  try {
    const ua = input.headers.get("user-agent") ?? "";
    if (isBot(ua)) return false;
    // nginx sets X-Real-IP from Cloudflare's CF-Connecting-IP (see the vhost); never stored
    const ip = input.headers.get("x-real-ip") ?? input.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const host = (input.headers.get("host") ?? "").split(":")[0];
    const ref = input.referrerType ? { type: input.referrerType, source: null, raw: null } : classifyReferrer(input.referrer, host);
    const { browser, os, device } = parseUserAgent(ua);
    const city = input.headers.get("cf-ipcity");
    await prisma.pageVisit.create({
      data: {
        kind: input.kind,
        path: input.path.slice(0, 300),
        salonSlug: input.salonSlug ?? salonSlugOf(input.path),
        visitorHash: createHash("sha256").update(`${VISITOR_SALT}|${ip}|${ua}`).digest("hex"),
        referrerType: ref.type,
        referrerSource: ref.source,
        referrerRaw: ref.raw,
        browser,
        os,
        device,
        country: (input.headers.get("cf-ipcountry") ?? "").toUpperCase().slice(0, 2) || "Unknown",
        city: city ? decodeURIComponent(city).slice(0, 80) : "Unknown",
      },
    });
    return true;
  } catch {
    return false; // analytics never breaks anything
  }
}

/** Daily: drop visits older than the retention (instrumentation.ts). */
export async function pruneOldVisits(now = new Date()) {
  const { count } = await prisma.pageVisit.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - VISIT_RETENTION_DAYS * 86_400_000) } } });
  return count;
}
