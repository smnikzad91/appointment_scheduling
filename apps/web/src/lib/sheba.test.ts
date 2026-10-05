import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSheba } from "./sheba.ts";

test("Sheba numbers are checked with the IBAN mod-97 rule", () => {
  assert.equal(normalizeSheba("IR062960000000100324200001"), "IR062960000000100324200001");
  assert.equal(normalizeSheba("ir06 2960 0000 0010 0324 2000 01"), "IR062960000000100324200001");
  assert.equal(normalizeSheba("۰۶۲۹۶۰۰۰۰۰۰۰۱۰۰۳۲۴۲۰۰۰۰۱"), "IR062960000000100324200001");
  assert.equal(normalizeSheba("IR062960000000100324200002"), null);
  assert.equal(normalizeSheba("IR0629600000001003242000"), null);
});
