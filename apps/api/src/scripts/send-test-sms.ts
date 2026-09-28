// Sends one SMS through NotifycloudService — the same client the OTP login uses — to check
// the gateway key end to end. Costs one SMS from the key's balance.
//   npm run sms:test -w api -- 09121234567 ["optional text"]
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { SmsModule } from "../sms/sms.module.js";
import { NotifycloudService } from "../sms/notifycloud.service.js";

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), SmsModule] })
class SendTestSmsModule {}

async function main() {
  const [number, text = "پیام آزمایشی سامانه نوبت‌دهی"] = process.argv.slice(2);
  if (!number) {
    console.error("Usage: npm run sms:test -w api -- <number> [text]");
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(SendTestSmsModule, { logger: ["error", "warn"] });
  const sms = app.get(NotifycloudService);
  if (!sms.enabled) {
    console.error("NOTIFYCLOUD_API_KEY is not set (apps/api/.env)");
    process.exit(1);
  }

  try {
    const result = await sms.sendSms(number, text, `test_${Date.now()}`);
    console.log("Queued:", result);
  } catch (err) {
    console.error("Send failed:", (err as Error).message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

void main();
