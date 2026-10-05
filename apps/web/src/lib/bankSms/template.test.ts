// node --test apps/web/src/lib/bankSms/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { compileTemplate, normalizeSender, parseAmount, parseSms, pickOffsetRial } from "./template.ts";
import { sign, verify } from "./signature.ts";

const TEMPLATE = "بانک ملت\nواریز: {amount} ریال\nکارت: {card}\nمانده: {balance}\n{date}-{time}";

test("parses a deposit SMS with Persian digits, Arabic letters and other line breaks", () => {
  const sms = "بانك ملت\r\nواريز: ۲٬۰۰۰٬۳۱۷ ريال\r\nكارت: ۶۱۰۴***۱۲۳۴\r\nمانده: ۱۵٬۴۰۰٬۰۰۰\r\n۱۴۰۵/۰۷/۱۳-۱۴:۲۵";
  assert.deepEqual(parseSms(TEMPLATE, sms), { amountRial: 2000317n, balanceRial: 15400000n, card: "6104***1234", date: "1405/07/13", time: "14:25" });
});

test("another kind of SMS (a withdrawal) doesn't fit", () => {
  assert.equal(parseSms(TEMPLATE, "بانک ملت\nبرداشت: 500,000 ریال\nمانده: 1,000"), null);
});

test("whitespace is flexible, text is exact", () => {
  assert.equal(parseSms("واریز {amount} ریال", "واریز2,000,317ریال")?.amountRial, 2000317n);
  assert.equal(parseSms("واریز {amount} ریال", "انتقال 2,000,317 ریال"), null);
});

test("{*} skips any text; the template needs {amount}, once", () => {
  assert.equal(parseSms("{*}مبلغ {amount} ریال{*}", "سلام\nمبلغ 1.000.000 ریال واریز شد")?.amountRial, 1000000n);
  assert.throws(() => compileTemplate("مانده {balance}"));
  assert.throws(() => compileTemplate("{amount} {amount}"));
});

test("amounts and senders normalise", () => {
  assert.equal(parseAmount("۱٬۲۵۰٬۰۰۰"), 1250000n);
  assert.equal(normalizeSender("+98 9999 123"), normalizeSender("09999123"));
  assert.equal(normalizeSender("BankMellat"), "bankmellat");
});

test("the offset avoids amounts already taken", () => {
  const base = 2000000n;
  const taken = new Set<bigint>(Array.from({ length: 999 }, (_, i) => base + BigInt(i + 1)));
  assert.equal(pickOffsetRial(base, taken), 1000);
  taken.add(base + 1000n);
  assert.throws(() => pickOffsetRial(base, taken), /NO_FREE_AMOUNT/);
});

test("device signatures: valid, tampered, replayed", () => {
  const now = 1_790_000_000_000;
  const body = '{"sender":"BankMellat"}';
  const sig = sign("s3cret", String(now), body);
  assert.equal(verify("s3cret", String(now), body, sig, now), true);
  assert.equal(verify("s3cret", String(now), body + " ", sig, now), false);
  assert.equal(verify("other", String(now), body, sig, now), false);
  assert.equal(verify("s3cret", String(now - 6 * 60_000), body, sign("s3cret", String(now - 6 * 60_000), body), now), false);
});

test("the device agent's signature passes the server's check (apps/bank-sms-agent/src/sign.mjs)", async () => {
  const { signedHeaders } = await import("../../../../bank-sms-agent/src/sign.mjs");
  const body = JSON.stringify({ deviceId: "bbb", sender: "BankMellat", body: "x", receivedAt: new Date(0).toISOString() });
  const h = signedHeaders("s3cret", body, 1_790_000_000_000);
  assert.equal(verify("s3cret", h["X-Bank-Sms-Timestamp"], body, h["X-Bank-Sms-Signature"], 1_790_000_000_000), true);
});
