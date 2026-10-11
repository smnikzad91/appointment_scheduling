// Copies each new deposit SMS (one that fit a card's template, matched to a top-up or not) to
// BANK_SMS_FORWARD_PHONE through notifycloud (SMS_API_KEY / SMS_API_URL, the same key as apps/api).
// Unset phone or key = off. Best-effort: a failure is logged, never fails the device's request.

const STATUS_LABEL = { MATCHED: "واریز (پرداخت شد)", UNMATCHED: "واریز (بدون درخواست)" } as const;

export async function forwardDepositSms(sms: { sender: string; body: string }, status: keyof typeof STATUS_LABEL) {
  const to = process.env.BANK_SMS_FORWARD_PHONE?.trim();
  const key = process.env.SMS_API_KEY;
  if (!to || !key) return;
  const url = (process.env.SMS_API_URL?.trim() || "https://notifycloud.ir").replace(/\/+$/, "");
  try {
    const res = await fetch(`${url}/api/v1/sms`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ number: to, text: `${STATUS_LABEL[status]} ${sms.sender}\n${sms.body}`, clientSmsId: `bank-sms-forward:${Date.now()}` }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`bank-sms forward: notifycloud ${res.status}`);
  } catch (err) {
    console.error("bank-sms forward failed:", err instanceof Error ? err.message : err);
  }
}
