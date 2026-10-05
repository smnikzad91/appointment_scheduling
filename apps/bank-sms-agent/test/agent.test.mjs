// node --test apps/bank-sms-agent/test/*.test.mjs   (Node 18+, no dependencies)
import { test } from "node:test";
import assert from "node:assert/strict";
import { decodePdu, unpackSeptets, gsm7ToString } from "../src/pdu.mjs";
import { addPart, STALE_MS } from "../src/assemble.mjs";
import { parseStoredMessages } from "../src/modem.mjs";

// ── a tiny SMS-DELIVER encoder, only for building test PDUs ──────────────────────────────────
const hex = (b) => Buffer.from(b).toString("hex").toUpperCase();
function packGsm7(text, fillBits = 0) {
  const GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  const septets = [...text].map((c) => GSM.indexOf(c));
  const bits = [];
  for (let i = 0; i < fillBits; i++) bits.push(0);
  for (const s of septets) for (let i = 0; i < 7; i++) bits.push((s >> i) & 1);
  const out = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8 && i + j < bits.length; j++) v |= bits[i + j] << j;
    out.push(v);
  }
  return out;
}
const swapBcd = (n) => ((n % 10) << 4) | Math.floor(n / 10);
function deliver({ sender, alnum = false, ucs2Text, concat }) {
  const smsc = [0x00];
  let first = 0x04;
  if (concat) first |= 0x40;
  let oa;
  if (alnum) {
    const packed = packGsm7(sender);
    oa = [packed.length * 2, 0xd0, ...packed];
  } else {
    const digits = sender.replace("+", "");
    const d = digits.length % 2 ? digits + "F" : digits;
    const bytes = [];
    for (let i = 0; i < d.length; i += 2) bytes.push(parseInt(d[i + 1] + d[i], 16));
    oa = [digits.length, sender.startsWith("+") ? 0x91 : 0x81, ...bytes];
  }
  // 2026-10-05 14:25:30, +03:30 (14 quarters)
  const scts = [26, 10, 5, 14, 25, 30].map(swapBcd).concat([swapBcd(14)]);
  const udh = concat ? [0x05, 0x00, 0x03, concat.ref, concat.total, concat.seq] : [];
  const body = [...Buffer.from(ucs2Text, "utf16le").swap16()];
  const ud = [...udh, ...body];
  return hex([...smsc, first, ...oa, 0x00, 0x08, ...scts, ud.length, ...ud]);
}

test("decodes a reference GSM 7-bit PDU (sender, time, text)", () => {
  const m = decodePdu("07911326040000F0040B911346610089F60000208062917314080CC8F71D14969741F977FD07");
  assert.equal(m.sender, "+31641600986");
  assert.equal(m.text, "How are you?");
  assert.equal(m.alphabet, "gsm7");
  assert.match(m.receivedAt, /^2002-08-26T/);
});

test("decodes a Persian (UCS2) SMS from an alphanumeric sender, with the time zone", () => {
  const m = decodePdu(deliver({ sender: "BankMellat", alnum: true, ucs2Text: "واریز: ۲٬۰۰۰٬۳۱۷ ریال" }));
  assert.equal(m.sender, "BankMellat");
  assert.equal(m.text, "واریز: ۲٬۰۰۰٬۳۱۷ ریال");
  assert.equal(m.receivedAt, "2026-10-05T10:55:30.000Z"); // 14:25:30 at +03:30
  assert.equal(m.concat, null);
});

test("multi-part SMS: parts in any order become one message with all their SIM slots", () => {
  const p1 = decodePdu(deliver({ sender: "+989991234", ucs2Text: "بانک ملت\nواریز: ۲٬۰۰۰٬۳۱۷", concat: { ref: 7, total: 2, seq: 1 } }));
  const p2 = decodePdu(deliver({ sender: "+989991234", ucs2Text: " ریال\nمانده: ۱۵٬۴۰۰٬۰۰۰", concat: { ref: 7, total: 2, seq: 2 } }));
  assert.deepEqual(p1.concat, { ref: 7, total: 2, seq: 1 });
  const parts = {};
  assert.deepEqual(addPart(parts, p2, 4), []);
  const [msg] = addPart(parts, p1, 3);
  assert.equal(msg.body, "بانک ملت\nواریز: ۲٬۰۰۰٬۳۱۷ ریال\nمانده: ۱۵٬۴۰۰٬۰۰۰");
  assert.deepEqual(msg.indexes, [3, 4]);
  assert.deepEqual(parts, {});
});

test("a part that never completes is sent alone after a day, marked", () => {
  const p1 = decodePdu(deliver({ sender: "+989991234", ucs2Text: "نیمه اول", concat: { ref: 9, total: 2, seq: 1 } }));
  const parts = {};
  addPart(parts, p1, 1, 0);
  const [msg] = addPart(parts, decodePdu(deliver({ sender: "x", alnum: true, ucs2Text: "دیگر" })), 2, STALE_MS + 1).filter((m) => m.indexes[0] === 1);
  assert.equal(msg.body, "نیمه اول [ناقص]");
});

test("GSM 7-bit with a concatenation header skips the fill bits", () => {
  const text = "Deposit 2000317 IRR";
  const septetsAfterHeader = packGsm7(text, 1); // 6 header octets = 48 bits → 1 fill bit to the next septet (49)
  const ud = [0x05, 0x00, 0x03, 1, 1, 1, ...septetsAfterHeader];
  const udl = 7 + text.length; // 7 septets of header (+fill) + text
  const swapped = [26, 10, 5, 14, 25, 30, 14].map(swapBcd);
  const pdu = hex([0x00, 0x44, 0x04, 0x81, 0x99, 0x99, 0x00, 0x00, ...swapped, udl, ...ud]);
  assert.equal(decodePdu(pdu).text, text);
});

test("GSM 7-bit extension characters (escape 0x1B)", () => {
  assert.equal(gsm7ToString([0x1b, 0x65, 0x20, 0x1b, 0x28, 0x1b, 0x29]), "€ {}");
  assert.equal(gsm7ToString(unpackSeptets(packGsm7("OK"), 2)), "OK");
});

test("reads +CMGL / +CMGR responses", () => {
  const lines = ["+CMGL: 3,1,,30", "0011AA", "+CMGL: 5,0,,22", "0022BB"];
  assert.deepEqual(parseStoredMessages(lines), [{ index: 3, pdu: "0011AA" }, { index: 5, pdu: "0022BB" }]);
  assert.deepEqual(parseStoredMessages(["+CMGR: 1,,30", "00CC"], 8), [{ index: 8, pdu: "00CC" }]);
});
