import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { checkCustom, mergeCustom } from "../../src/modules/customFields/custom.js";

const defs = [
  { fieldKey: "cf_a", fieldType: "TEXT", required: true, options: null },
  { fieldKey: "cf_n", fieldType: "NUMBER", required: false, options: null },
  { fieldKey: "cf_d", fieldType: "DROPDOWN", required: false, options: ["Red", "Blue"] },
  { fieldKey: "cf_t", fieldType: "DATE", required: false, options: null },
];
test("custom field validation", () => {
  assert.equal(checkCustom({}, defs), null, "drafts may leave required fields empty");
  assert.equal(checkCustom({}, defs, { requireAll: true })["customData.cf_a"], "This field is required");
  assert.equal(checkCustom({ cf_n: "abc" }, defs)["customData.cf_n"], "Enter a valid number");
  assert.equal(checkCustom({ cf_d: "Green" }, defs)["customData.cf_d"], "Choose a valid option");
  assert.equal(checkCustom({ cf_t: "zzz" }, defs)["customData.cf_t"], "Enter a valid date");
  assert.equal(checkCustom({ cf_gone: "x" }, defs)["customData.cf_gone"], "This field is no longer available");
  assert.equal(checkCustom({ cf_gone: "x", cf_a: "ok" }, defs, { skipUnknown: true }), null);
  assert.equal(checkCustom({ cf_a: "ok", cf_n: "12", cf_d: "Red", cf_t: "2026-01-31" }, defs, { requireAll: true }), null);
});
test("merge keeps values of removed fields, clears empties, casts numbers", () => {
  const out = mergeCustom({ cf_old: "keep", cf_a: "x" }, { cf_a: "", cf_n: "7", cf_unknown: "no" }, defs);
  assert.deepEqual(out, { cf_old: "keep", cf_n: 7 });
});
