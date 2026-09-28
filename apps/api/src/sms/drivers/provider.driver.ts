import type { SmsDriver, SmsMessage } from "../sms.types.js";

/**
 * The real SMS provider (SMS_DRIVER=provider). Fill in `send` once the provider's API is known:
 * credentials come from env (SMS_API_URL, SMS_API_KEY, SMS_SENDER — add others as needed, never
 * hard-code them), phone numbers arrive as 09xxxxxxxxx (convert if the API wants 98…), and for a
 * template ("pattern") API map `message.kind` to its template id and pass `message.params`;
 * for a free-text API send `message.text`. Throw on any non-success response.
 */
export class ProviderSmsDriver implements SmsDriver {
  readonly name = "provider";

  constructor(
    private readonly config: {
      url?: string;
      apiKey?: string;
      sender?: string;
      templates: Partial<Record<SmsMessage["kind"], string>>;
    },
  ) {}

  async send(message: SmsMessage): Promise<void> {
    void message;
    throw new Error("SMS provider driver is not implemented yet — set SMS_DRIVER=log until it is");
  }
}
