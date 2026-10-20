import { test } from "node:test";
import assert from "node:assert/strict";
import { parseWalletQuery, walletOrderBy, walletWhere } from "./walletQuery.ts";

const q = (s: string) => parseWalletQuery(new URLSearchParams(s));

test("no parameters = the newest 50, everything", () => {
  assert.deepEqual(q(""), { direction: "all", kind: null, period: "all", sort: "newest", page: 1, pageSize: 50 });
  assert.deepEqual(walletWhere(q("")), {});
});

test("filters become a Prisma where", () => {
  const now = new Date("2026-10-20T00:00:00Z");
  assert.deepEqual(walletWhere(q("direction=in&kind=sms_cost&period=7"), now), {
    amountToman: { gt: 0 },
    kind: "SMS_COST",
    createdAt: { gte: new Date("2026-10-13T00:00:00Z") },
  });
  assert.deepEqual(walletWhere(q("direction=out")), { amountToman: { lt: 0 } });
});

test("bad values fall back to defaults; page size is capped", () => {
  assert.deepEqual(q("direction=up&kind=DROP&period=2&sort=x&page=-3&pageSize=5000"), {
    direction: "all", kind: null, period: "all", sort: "newest", page: 1, pageSize: 100,
  });
  assert.equal(q("page=2.5").page, 1);
  assert.equal(q("page=3&pageSize=20").page, 3);
});

test("every order ends with a unique key", () => {
  for (const s of ["newest", "oldest", "credit", "debit"] as const) assert.ok("id" in walletOrderBy(s).at(-1)!);
  assert.deepEqual(walletOrderBy("debit")[0], { amountToman: "asc" });
});
