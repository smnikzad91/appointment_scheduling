import { createHmac } from "node:crypto";

// Same scheme as apps/web src/lib/bankSms/signature.ts: hex HMAC-SHA256(secret, "<ms timestamp>.<body>").
export function signedHeaders(secret, body, now = Date.now()) {
  const timestamp = String(now);
  return {
    "Content-Type": "application/json",
    "X-Bank-Sms-Timestamp": timestamp,
    "X-Bank-Sms-Signature": createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex"),
  };
}
