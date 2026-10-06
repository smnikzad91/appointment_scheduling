import { randomUUID } from "node:crypto";
import type { SmsDriver, SmsMessage } from "../sms.types.js";

const DEFAULT_URL = "https://notifycloud.ir";

/**
 * The real SMS provider (SMS_DRIVER=provider): notifycloud.ir, our own GSM gateway.
 * POST {SMS_API_URL}/api/v1/sms with `Authorization: Bearer {SMS_API_KEY}` and free text (sent
 * as Unicode, so Persian is fine; ≤70 chars is one segment, longer ones cost ceil(n/67)).
 * 200 means queued, not delivered — there's no status lookup. Limit: 30 requests/min per key
 * (429 + Retry-After). Each key has its own prepaid balance ("Insufficient API key balance.").
 * Templates/sender aren't used by this API.
 */
export class ProviderSmsDriver implements SmsDriver {
  readonly name = "provider";
  private readonly url: string;

  constructor(
    private readonly config: {
      url?: string;
      apiKey?: string;
      sender?: string;
      templates: Partial<Record<SmsMessage["kind"], string>>;
    },
  ) {
    this.url = (config.url?.trim() || DEFAULT_URL).replace(/\/+$/, "");
  }

  async send(message: SmsMessage): Promise<{ cost?: number }> {
    if (!this.config.apiKey) throw new Error("SMS_API_KEY is not set");
    const res = await fetch(`${this.url}/api/v1/sms`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
      // clientSmsId is ours, echoed back by the gateway; the kind says what it was for.
      body: JSON.stringify({ number: message.to, text: message.text, clientSmsId: `${message.kind}:${randomUUID()}` }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      const retryAfter = res.headers.get("Retry-After");
      throw new Error(`notifycloud ${res.status}: ${body.error ?? res.statusText}${retryAfter ? ` (retry after ${retryAfter}s)` : ""}`);
    }
    // the gateway answers with what it took from the key's balance (toman): charged on to the booking's stylist
    const body = (await res.json().catch(() => ({}))) as { cost?: unknown };
    const cost = Number(body.cost);
    return { cost: Number.isFinite(cost) && cost > 0 ? Math.round(cost) : undefined };
  }
}
