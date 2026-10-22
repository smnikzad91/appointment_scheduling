import { test } from "node:test";
import assert from "node:assert/strict";
import { groupServicesByCategory } from "./serviceGroups.ts";

const cats = [
  { id: "nail", name: "ناخن", order: 1 },
  { id: "hair", name: "مو", order: 0 },
  { id: "empty", name: "خالی", order: 2 },
];

test("no categories: every service, one group without a heading", () => {
  const g = groupServicesByCategory([], [{ id: "a", categoryId: null }, { id: "b", categoryId: null }]);
  assert.deepEqual(g, [{ key: "uncategorized", name: null, services: [{ id: "a", categoryId: null }, { id: "b", categoryId: null }] }]);
});

test("categories by order, empty ones dropped, the rest last as «سایر خدمات»", () => {
  const g = groupServicesByCategory(cats, [
    { id: "a", categoryId: "nail" },
    { id: "b", categoryId: null },
    { id: "c", categoryId: "hair" },
    { id: "d", categoryId: "deleted-category" },
  ]);
  assert.deepEqual(g.map((x) => [x.name, x.services.map((s) => s.id)]), [
    ["مو", ["c"]],
    ["ناخن", ["a"]],
    ["سایر خدمات", ["b", "d"]],
  ]);
});

test("unused categories and only uncategorized services: no heading", () => {
  assert.equal(groupServicesByCategory(cats, [{ id: "a", categoryId: null }])[0].name, null);
});
