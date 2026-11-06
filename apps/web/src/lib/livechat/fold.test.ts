import { test } from "node:test";
import assert from "node:assert/strict";
import { hasKeyword } from "./fold.ts";

test("live chat auto replies: keywords match however the word was typed", () => {
  assert.ok(hasKeyword("سلام، چطور کیف پولم رو شارژ کنم؟", ["شارژ"]));
  assert.ok(hasKeyword("ثبت نام سالن چطوریه", ["ثبت‌نام سالن"])); // ZWNJ vs space
  assert.ok(hasKeyword("پيش پرداخت برگشت مي‌خورد؟", ["پیش‌پرداخت"])); // Arabic ی
  assert.ok(hasKeyword("می‌خوام آرایشگر اضافه کنم", ["آرایشگر اضافه"]));
  assert.equal(hasKeyword("ساعت کاری سالن چنده", ["شارژ", "لغو"]), false);
  assert.equal(hasKeyword("", ["شارژ"]), false);
  assert.equal(hasKeyword("لغو", [" "]), false);
});
