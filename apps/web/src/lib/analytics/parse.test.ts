import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyReferrer, isBot, isTrackedPath, parseUserAgent, salonSlugOf } from "./parse.ts";

test("referrers", () => {
  assert.deepEqual(classifyReferrer(null, "nobatet.app"), { type: "direct", source: null, raw: null });
  assert.equal(classifyReferrer("https://www.nobatet.app/salons", "nobatet.app").type, "internal");
  assert.deepEqual(classifyReferrer("https://www.google.com/search?q=x", "nobatet.app").type, "search");
  assert.equal(classifyReferrer("https://l.instagram.com/?u=x", "nobatet.app").type, "social");
  assert.equal(classifyReferrer("https://example.org/a", "nobatet.app").source, "example.org");
  assert.equal(classifyReferrer("not a url", "nobatet.app").type, "direct");
});

test("user agents and bots", () => {
  const androidChrome = "Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";
  assert.deepEqual(parseUserAgent(androidChrome), { browser: "Chrome", os: "Android", device: "mobile" });
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  assert.deepEqual(parseUserAgent(iphone), { browser: "Safari", os: "iOS", device: "mobile" });
  assert.equal(parseUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 Edg/120").browser, "Edge");
  assert.equal(parseUserAgent("Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36").device, "desktop");
  assert.equal(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(isBot("TelegramBot (like TwitterBot)"), true);
  assert.equal(isBot(androidChrome), false);
});

test("tracked pages and salon slugs", () => {
  assert.equal(isTrackedPath("/"), true);
  assert.equal(isTrackedPath("/s/salon-w7dds"), true);
  assert.equal(isTrackedPath("/salons"), true); // the public search, not the /salon panel
  assert.equal(isTrackedPath("/salon/appointments"), false);
  assert.equal(isTrackedPath("/admin"), false);
  assert.equal(isTrackedPath("/dashboard/finance"), false);
  assert.equal(salonSlugOf("/s/salon-w7dds"), "salon-w7dds");
  assert.equal(salonSlugOf("/salons"), null);
});
