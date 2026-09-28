// Sends one SMS through the real provider driver (notifycloud.ir) with the key in apps/api/.env,
// to check the gateway end to end. Costs one SMS from the key's balance. Needs no database.
//   npm run sms:test -w api -- 09121234567 ["optional text"]
import { ProviderSmsDriver } from "../sms/drivers/provider.driver.js";

async function main() {
  const [to, text = "پیام آزمایشی نوبتا"] = process.argv.slice(2);
  if (!to || !/^09\d{9}$/.test(to)) {
    console.error("Usage: npm run sms:test -w api -- 09xxxxxxxxx [text]");
    process.exit(1);
  }

  try {
    process.loadEnvFile(".env");
  } catch {
    // no .env here — use the environment as it is
  }
  if (!process.env.SMS_API_KEY) {
    console.error("SMS_API_KEY is not set (apps/api/.env)");
    process.exit(1);
  }
  if (process.env.SMS_DRIVER !== "provider") {
    console.warn(`Note: SMS_DRIVER is "${process.env.SMS_DRIVER ?? "log"}", so the app itself isn't sending real SMS yet — this test sends anyway.`);
  }

  const driver = new ProviderSmsDriver({ url: process.env.SMS_API_URL, apiKey: process.env.SMS_API_KEY, templates: {} });
  try {
    await driver.send({ kind: "otp", to, params: { code: "", domain: "" }, text });
    console.log(`Queued for ${to} — it should arrive within a few seconds.`);
  } catch (err) {
    console.error(`Send failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

void main();
