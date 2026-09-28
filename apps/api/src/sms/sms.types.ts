/**
 * What the app sends. Each message has a kind (so a template-based provider can map it to its
 * pattern/template id), the values that fill it, and a ready-made Persian text for providers
 * that take free text. A driver uses whichever its API needs.
 */
export type SmsMessage =
  | { kind: "otp"; to: string; params: { code: string }; text: string }
  | {
      kind: "reminder-customer";
      to: string;
      params: { time: string; salon: string; stylist: string };
      text: string;
    }
  | {
      kind: "reminder-stylist";
      to: string;
      params: { time: string; customer: string; services: string };
      text: string;
    };

export type SmsKind = SmsMessage["kind"];

/** A provider. Throw on failure — SmsService logs it to the admin error log. */
export interface SmsDriver {
  readonly name: string;
  send(message: SmsMessage): Promise<void>;
}
