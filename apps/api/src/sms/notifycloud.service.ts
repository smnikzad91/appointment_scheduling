import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface NotifycloudSmsResult {
  id: string;
  clientSmsId: string;
  cost: number;
}

/** Thrown when notifycloud rejects a send (bad key, no balance, rate limit, network). */
export class SmsSendError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
  }
}

/** Client for notifycloud.ir, our own SMS gateway. A 200 means queued, not delivered —
 * there's no status lookup, only an optional delivery webhook. Rate limit: 30 req/min per key. */
@Injectable()
export class NotifycloudService {
  private readonly logger = new Logger(NotifycloudService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>("NOTIFYCLOUD_BASE_URL", "https://notifycloud.ir").replace(/\/+$/, "");
    this.apiKey = config.get<string>("NOTIFYCLOUD_API_KEY", "");
  }

  /** False in dev when no key is configured — callers skip sending. */
  get enabled(): boolean {
    return this.apiKey.length > 0;
  }

  async sendSms(number: string, text: string, clientSmsId: string, webhookUrl?: string): Promise<NotifycloudSmsResult> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/v1/sms`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ number, text, clientSmsId, ...(webhookUrl ? { webhookUrl } : {}) }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      this.logger.error(`notifycloud SMS request failed: ${(err as Error).message}`);
      throw new SmsSendError((err as Error).message, null);
    }

    const body = (await res.json().catch(() => ({}))) as { error?: string } & Partial<NotifycloudSmsResult>;
    if (!res.ok) {
      const message = body.error ?? `notifycloud HTTP ${res.status}`;
      const retryAfter = res.headers.get("Retry-After");
      this.logger.error(`notifycloud SMS failed (${res.status}): ${message}${retryAfter ? ` (retry after ${retryAfter}s)` : ""}`);
      throw new SmsSendError(message, res.status);
    }
    return body as NotifycloudSmsResult;
  }
}
