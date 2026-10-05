import { createHmac, timingSafeEqual } from "crypto";

// The bank-SMS device signs each request: X-Bank-Sms-Signature = hex HMAC-SHA256(secret,
// "<X-Bank-Sms-Timestamp>.<raw body>"). A request older or newer than 5 minutes is refused
// (no replays); the secret is BANK_SMS_DEVICE_SECRET, the same on the device.

export const MAX_SKEW_MS = 5 * 60_000;

export function sign(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verify(secret: string, timestamp: string | null, body: string, signature: string | null, now = Date.now()): boolean {
  if (!secret || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now - Number(timestamp)) > MAX_SKEW_MS) return false;
  const expected = Buffer.from(sign(secret, timestamp, body), "hex");
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
