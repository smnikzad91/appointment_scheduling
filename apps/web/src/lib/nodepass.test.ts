import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyWebhook } from "./nodepass.ts";

process.env.NODEPASS_WEBHOOK_SECRET = "s3cret";
const body = JSON.stringify({ event: "payment.paid", payment: { id: "p1" } });
const sign = (ts: string, raw = body, secret = "s3cret") => createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex");

test("a webhook signed with the secret is accepted", () => {
  const now = Date.now();
  assert.equal(verifyWebhook(body, String(now), sign(String(now)), now), true);
});

test("a changed body, another secret or a stale timestamp is refused", () => {
  const now = Date.now();
  const ts = String(now);
  assert.equal(verifyWebhook(body + " ", ts, sign(ts), now), false);
  assert.equal(verifyWebhook(body, ts, sign(ts, body, "other"), now), false);
  const old = String(now - 6 * 60_000);
  assert.equal(verifyWebhook(body, old, sign(old), now), false);
  assert.equal(verifyWebhook(body, null, sign(ts), now), false);
  assert.equal(verifyWebhook(body, ts, "not-hex", now), false);
});

test("nothing is accepted without a configured secret", () => {
  const now = Date.now();
  const ts = String(now);
  const sig = sign(ts);
  delete process.env.NODEPASS_WEBHOOK_SECRET;
  assert.equal(verifyWebhook(body, ts, sig, now), false);
  process.env.NODEPASS_WEBHOOK_SECRET = "s3cret";
});
