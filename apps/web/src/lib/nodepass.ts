import { createHmac, timingSafeEqual } from "crypto";

// nodepass.ir (/root/projects/nodepass.ir): card-to-card payments confirmed by the bank's deposit SMS, shared with
// mychatbot.ir — the only way money comes into a wallet (lib/topUps.ts): we send the amount, our top-up id
// as clientOrderId and our webhook URL; nodepass picks the card and the extra 1–1000 rial and calls
// /api/nodepass/webhook when the payment is paid, expired or cancelled.
// Env: NODEPASS_API_KEY (unset = top-ups unavailable), NODEPASS_URL (default https://nodepass.ir),
// NODEPASS_WEBHOOK_SECRET; the webhook is on NEXT_PUBLIC_SITE_URL.

export const nodepassConfigured = () => !!process.env.NODEPASS_API_KEY;

export interface NodepassPayment {
  id: string;
  merchantRef: string;
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED";
  amountToman: number;
  offsetRial: number;
  payableRial: string;
  paidRial: string | null;
  trackingCode: string;
  card: { number: string; ownerName: string; bankName: string };
  expiresAt: string;
  paidAt: string | null;
}

export class NodepassError extends Error {
  readonly status: number;
  readonly code: string | null;
  constructor(status: number, code: string | null, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function call(method: string, path: string, body?: unknown): Promise<NodepassPayment> {
  const base = (process.env.NODEPASS_URL || "https://nodepass.ir").replace(/\/$/, "");
  const res = await fetch(`${base}/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${process.env.NODEPASS_API_KEY}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new NodepassError(res.status, data?.error ?? null, data?.message ?? `nodepass ${method} ${path} → ${res.status}`);
  return data as NodepassPayment;
}

export function webhookUrl() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://nobatet.app").replace(/\/$/, "");
  return `${site}/api/nodepass/webhook`;
}

export const createPayment = (amountToman: number, clientOrderId: string) =>
  call("POST", "/payments", { amountToman, clientOrderId, webhookUrl: webhookUrl() });
export const getPayment = (id: string) => call("GET", `/payments/${encodeURIComponent(id)}`);
export const cancelPayment = (id: string) => call("POST", `/payments/${encodeURIComponent(id)}/cancel`);

/** nodepass's webhook signature: hex HMAC-SHA256(secret, "<ts ms>.<raw body>"), ±5 min. */
export function verifyWebhook(rawBody: string, timestamp: string | null, signature: string | null, now = Date.now()): boolean {
  const secret = process.env.NODEPASS_WEBHOOK_SECRET;
  if (!secret || !timestamp || !/^\d{10,16}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 5 * 60_000) return false;
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const want = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  return timingSafeEqual(want, Buffer.from(signature, "hex"));
}
