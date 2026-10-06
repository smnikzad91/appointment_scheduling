/**
 * What the app sends. Each message has a kind (so a template-based provider can map it to its
 * pattern/template id), the values that fill it, and a ready-made Persian text for providers
 * that take free text. A driver uses whichever its API needs.
 */
export type SmsMessage =
  | { kind: "otp"; to: string; params: { code: string; domain: string }; text: string }
  | {
      kind: "reminder-customer";
      to: string;
      params: { time: string; salon: string; stylist: string };
      text: string;
    }
  | {
      kind: "reminder-stylist";
      to: string;
      params: { time: string; customer: string };
      text: string;
    }
  | {
      /** The salon or the stylist booked, moved or cancelled the customer's appointment, or the
       * stylist confirmed the one they booked online. */
      kind: "booked-customer" | "rescheduled-customer" | "cancelled-customer" | "confirmed-customer";
      to: string;
      params: { day: string; time: string; salon: string; stylist: string };
      text: string;
    }
  | {
      /** The customer booked online (or it's still unconfirmed hours later); the stylist is asked
       * to confirm it in their panel. */
      kind: "new-booking-stylist" | "confirm-nudge-stylist" | "state-nudge-stylist";
      to: string;
      params: { day: string; time: string; customer: string };
      text: string;
    }
  | {
      /** "Time to book again", some days after a completed appointment (RebookReminderService). */
      kind: "rebook-customer";
      to: string;
      params: { customer: string; days: string; service: string; salon: string; link: string };
      text: string;
    }
  | {
      /** A wallet top-up was confirmed by the bank SMS (or matched by the admin) — wallet/top-up-sms. */
      kind: "topup-paid";
      to: string;
      params: { amount: string; balance: string };
      text: string;
    }
  | {
      /** The admin paid or rejected a wallet withdrawal (apps/web) — wallet/withdrawal-sms. */
      kind: "withdrawal-paid" | "withdrawal-rejected";
      to: string;
      params: { amount: string; trackingCode: string };
      text: string;
    }
  | {
      /** The stylist asked for the rest of a completed booking from the customer's wallet. */
      kind: "balance-request-customer";
      to: string;
      params: { amount: string; salon: string };
      text: string;
    };

export type SmsKind = SmsMessage["kind"];

/** A provider. Throw on failure — SmsService logs it to the admin error log. */
export interface SmsDriver {
  readonly name: string;
  /** Resolves with what the gateway charged (toman), when it says; the log driver costs nothing. */
  send(message: SmsMessage): Promise<{ cost?: number } | void>;
}

/** Who pays for a booking SMS: the booking's stylist (SmsService charges their wallet the gateway's cost). */
export interface SmsCharge {
  userId: string;
  appointmentId?: string;
  /** shown in the wallet history, e.g. «یادآوری به مشتری» */
  note: string;
}
