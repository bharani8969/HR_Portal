import test from "node:test";
import assert from "node:assert/strict";
import { parseRecipients } from "../../src/utils/recipients.js";

test("destination list: normalised, de-duplicated, validated, limited", () => {
  assert.deepEqual(parseRecipients([" A@X.com ", "a@x.com", "b@y.org"]), { ok: true, value: ["a@x.com", "b@y.org"] });
  assert.match(parseRecipients(["good@x.com", "not-an-email"]).error, /not a valid email/);
  assert.match(parseRecipients([]).error, /at least one/);
  assert.match(parseRecipients(["", "  "]).error, /at least one/);
  assert.match(parseRecipients(["1@x.com", "2@x.com", "3@x.com", "4@x.com", "5@x.com", "6@x.com"]).error, /up to 5/);
  assert.equal(parseRecipients("a@x.com").ok, false);
  assert.equal(parseRecipients(undefined).ok, false);
});
