import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@appointment-scheduling/database";

/** How long an invited stylist's "set your password" link works. */
export const SETUP_LINK_TTL_DAYS = 7;

/** Only this hash is stored, so a leaked database can't be turned into working links. */
export function hashSetupToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a fresh one-time link secret for `userId` and ends any earlier unused one, so only the
 * newest link the owner shared works. Returns the raw secret — shown once, never stored.
 */
export async function issueSetupToken(tx: Prisma.TransactionClient, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SETUP_LINK_TTL_DAYS * 864e5);
  await tx.passwordSetupToken.deleteMany({ where: { userId, usedAt: null } });
  await tx.passwordSetupToken.create({ data: { userId, tokenHash: hashSetupToken(token), expiresAt } });
  return { setupToken: token, expiresAt };
}

/** A password nobody knows, for an account whose owner hasn't chosen one yet. */
export function unusablePassword(): string {
  return randomBytes(32).toString("base64url");
}
