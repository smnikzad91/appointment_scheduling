// Copies each new deposit SMS (one that fit a card's template, matched to a top-up or not) to
// BANK_SMS_FORWARD_PHONE through notifycloud (lib/notifycloud.ts). Unset phone or key = off.
// Best-effort: a failure is logged, never fails the device's request.

import { sendPlatformSms } from "@/lib/notifycloud";

const STATUS_LABEL = { MATCHED: "واریز (پرداخت شد)", UNMATCHED: "واریز (بدون درخواست)" } as const;

export async function forwardDepositSms(sms: { sender: string; body: string }, status: keyof typeof STATUS_LABEL) {
  const to = process.env.BANK_SMS_FORWARD_PHONE?.trim();
  if (!to) return;
  await sendPlatformSms(to, `${STATUS_LABEL[status]} ${sms.sender}\n${sms.body}`, `bank-sms-forward:${Date.now()}`, "bank-sms forward");
}
