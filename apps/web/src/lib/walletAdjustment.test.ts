import { test } from "node:test";
import assert from "node:assert/strict";
import { adjustmentSmsText, parseAdjustment, parseToman } from "./walletAdjustment.ts";

test("amounts accept Persian digits and separators", () => {
  assert.equal(parseToman("۱۲٬۰۰۰"), 12000);
  assert.equal(parseToman("12,500"), 12500);
  assert.equal(parseToman(300), 300);
  assert.ok(Number.isNaN(parseToman("12.5")));
  assert.ok(Number.isNaN(parseToman("-5")));
});

test("credit is positive, debit negative, with the reason trimmed", () => {
  assert.deepEqual(parseAdjustment({ direction: "credit", amountToman: "۵۰۰٬۰۰۰", note: "  واریز بدون ۳ ریال  " }), { amountToman: 500000, note: "واریز بدون ۳ ریال", notify: true });
  assert.deepEqual(parseAdjustment({ direction: "debit", amountToman: 1000, note: "اصلاح" }), { amountToman: -1000, note: "اصلاح", notify: true });
  assert.equal((parseAdjustment({ direction: "credit", amountToman: 1, note: "x", notify: false }) as { notify: boolean }).notify, false);
});

test("bad input is refused", () => {
  assert.deepEqual(parseAdjustment({ direction: "credit", amountToman: 0, note: "x" }), { error: "Invalid amount" });
  assert.deepEqual(parseAdjustment({ direction: "add", amountToman: 10, note: "x" }), { error: "Invalid amount" });
  assert.deepEqual(parseAdjustment({ direction: "credit", amountToman: 100_000_001, note: "x" }), { error: "Amount too large" });
  assert.deepEqual(parseAdjustment({ direction: "credit", amountToman: 10, note: "  " }), { error: "A reason is required" });
  assert.deepEqual(parseAdjustment({ direction: "credit", amountToman: 10, note: "x".repeat(201) }), { error: "Reason too long" });
  assert.deepEqual(parseAdjustment(null), { error: "Invalid amount" });
});

test("the SMS says what changed and the new balance, in one segment", () => {
  const credit = adjustmentSmsText(500000, 620000);
  assert.equal(credit, "کیف پول نوبتت ۵۰۰٬۰۰۰ تومان شارژ شد\nموجودی: ۶۲۰٬۰۰۰ تومان");
  assert.equal(adjustmentSmsText(-50000, 0), "از کیف پول نوبتت ۵۰٬۰۰۰ تومان کسر شد\nموجودی: ۰ تومان");
  assert.ok(adjustmentSmsText(-99_999_999, 99_999_999).length <= 70);
});
