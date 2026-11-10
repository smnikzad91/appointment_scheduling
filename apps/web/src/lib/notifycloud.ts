// One SMS through notifycloud (SMS_API_KEY / SMS_API_URL, the same key as apps/api) for apps/web's own
// alerts to the platform admin. No key = off. Best-effort: a failure is logged and never thrown.

export async function sendPlatformSms(to: string, text: string, clientSmsId: string, logTag: string) {
  const key = process.env.SMS_API_KEY;
  if (!to || !key) return;
  const url = (process.env.SMS_API_URL?.trim() || "https://notifycloud.ir").replace(/\/+$/, "");
  try {
    const res = await fetch(`${url}/api/v1/sms`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ number: to, text, clientSmsId }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`${logTag}: notifycloud ${res.status}`);
  } catch (err) {
    console.error(`${logTag} failed:`, err instanceof Error ? err.message : err);
  }
}
