import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { fieldErrors } from "../../src/utils/helpers.js";

const schema = z.object({
  firstName: z.string().trim().min(1).max(10),
  email: z.string().email().optional(),
  pan: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/).optional(),
  dob: z.coerce.date().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  password: z.string().min(12).optional(),
  customData: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});
const run = (v) => fieldErrors(schema.safeParse(v).error, { pan: "PAN format: ABCDE1234F" });

test("each failing input gets its own friendly message", () => {
  const e = run({ firstName: "", email: "nope", pan: "123", dob: "not-a-date", gender: "X", password: "short" });
  assert.equal(e.firstName, "This field is required");
  assert.equal(e.email, "Enter a valid email address");
  assert.equal(e.pan, "PAN format: ABCDE1234F");
  assert.equal(e.dob, "Enter a valid date");
  assert.equal(e.gender, "Choose a valid option");
  assert.equal(e.password, "Must be at least 12 characters");
});
test("missing and too-long values", () => {
  assert.equal(run({}).firstName, "This field is required");
  assert.equal(run({ firstName: "x".repeat(11) }).firstName, "Must be at most 10 characters");
});
test("nested paths use dotted keys", () => {
  const e = run({ firstName: "Ann", customData: { cf_1: { bad: true } } });
  assert.ok(Object.keys(e).some((k) => k.startsWith("customData.cf_1")));
});
