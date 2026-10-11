import { createHash, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Card-to-card top-ups for mychatbot.ir (Telegram bot selling Marzban subscriptions, /root/projects/
// mychatbot.ir): it calls /api/external/top-ups with `Authorization: Bearer <EXTERNAL_TOP_UP_KEY>`
// (the same key is NOBATET_API_KEY there). Its top-ups belong to one service account that can't log
// in; when the bank SMS pays one, the credit lands in that account's wallet like any top-up.

const SERVICE_EMAIL = "mychatbot@service.nobatet.app";

export function authorized(req: NextRequest): boolean {
  const key = process.env.EXTERNAL_TOP_UP_KEY;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!key || !given) return false;
  const a = createHash("sha256").update(key).digest();
  const b = createHash("sha256").update(given).digest();
  return timingSafeEqual(a, b);
}

/** The service account's id (created the first time; its password is random and never stored). */
export async function serviceUserId(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: SERVICE_EMAIL }, select: { id: true } });
  if (existing) return existing.id;
  const user = await prisma.user.upsert({
    where: { email: SERVICE_EMAIL },
    update: {},
    create: {
      email: SERVICE_EMAIL,
      passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10),
      firstName: "mychatbot.ir",
      lastName: "ربات تلگرام",
      role: "CUSTOMER",
      promoSmsOptOut: true,
    },
    select: { id: true },
  });
  return user.id;
}
