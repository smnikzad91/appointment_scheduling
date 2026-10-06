// node --test apps/web/src/lib/bankSms/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { compileTemplate, normalizeSender, parseAmount, parseSms, pickOffsetRial, senderList, senderMatches } from "./template.ts";
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

test("account-number / signed-amount / date_time / مانده format (the platform card's bank)", () => {
  const template = "{*}\n+{amount}\n{date}_{time}\nمانده: {balance}";
  const deposit = "777.888.23862333.1\n+300,450\n07/12_12:39\nمانده: 610,400";
  assert.deepEqual(parseSms(template, deposit), {
    amountRial: BigInt(300450), balanceRial: BigInt(610400), card: null, date: "07/12", time: "12:39",
  });
  // the same bank's withdrawal is not a deposit
  assert.equal(parseSms(template, "777.888.23862333.1\n-300,000\n07/12_12:39\nمانده: 309,950"), null);
  // Persian digits and bidi marks from the phone/modem still match
  assert.equal(parseSms(template, "‏۷۷۷.۸۸۸.۲۳۸۶۲۳۳۳.۱\n‎+۳۰۰,۴۵۰\n۰۷/۱۲_۱۲:۳۹\nمانده: ۶۱۰,۴۰۰")?.amountRial, BigInt(300450));
});

test("B.Pasargad end to end: what the agent decodes is matched by sender and template", async () => {
  const { decodePdu } = await import("../../../../bank-sms-agent/src/pdu.mjs");
  const body = "777.888.23862333.1\n+300,450\n07/12_12:39\nمانده: 610,400";
  // SMS-DELIVER from alphanumeric "B.Pasargad" (17 semi-octets, as some networks round), UCS2 text
  const septets = [..."B.Pasargad"].map((c) => c.charCodeAt(0));
  const packed: number[] = [];
  let acc = 0, bits = 0;
  for (const s of septets) { acc |= s << bits; bits += 7; while (bits >= 8) { packed.push(acc & 0xff); acc >>= 8; bits -= 8; } }
  if (bits > 0) packed.push(acc & 0xff);
  const ud = [...Buffer.from(body, "utf16le").swap16()];
  const bytes = [0x00, 0x04, 17, 0xd0, ...packed, 0x00, 0x08, 0x62, 0x01, 0x50, 0x41, 0x52, 0x03, 0x41, ud.length, ...ud];
  const sms = decodePdu(Buffer.from(bytes).toString("hex"));
  assert.equal(normalizeSender(sms.sender), normalizeSender("B.Pasargad"));
  assert.equal(parseSms("{*}\n+{amount}\n{date}_{time}\nمانده: {balance}", sms.text)?.amountRial, BigInt(300450));
});

test("a card can list several senders (commas, «،», semicolons, new lines)", () => {
  const stored = "B.Pasargad, +98 9999 123\n0999 456 ؛ 0999456،9821";
  assert.deepEqual(senderList("B.Pasargad, +98 9999 123\n0999456;0999456،9821"), ["b.pasargad", "9999123", "999456", "21"]);
  assert.equal(senderMatches(stored, "0999456"), true); // after «؛»
  assert.equal(senderMatches(stored, "b.pasargad"), true);
  assert.equal(senderMatches(stored, "+989999123"), true);
  assert.equal(senderMatches(stored, "00989999123"), true);
  assert.equal(senderMatches(stored, "+989999124"), false);
  assert.equal(senderMatches(stored, ""), false);
});
