import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "./helpers.js";

test("concern form is public, fixed-recipient, validated per field and stored", async () => {
  const c = new Client();
  const info = await c.call("/support/info");
  assert.equal(info.status, 200);
  assert.match(info.json.data.to, /@/);
  const bad = await c.call("/support/concern", { method: "POST", body: { name: "A", email: "nope", category: "Other", message: "short" } });
  assert.equal(bad.status, 422);
  assert.ok(bad.json.error.fields.name && bad.json.error.fields.email && bad.json.error.fields.message, "errors under each field");
  const badCat = await c.call("/support/concern", { method: "POST", body: { name: "Test User", email: "t@example.test", category: "Spam", message: "A valid length message." } });
  assert.equal(badCat.json.error.fields.category, "Choose a valid option");
  const good = await c.call("/support/concern", { method: "POST", body: { name: "Test User", email: "t@example.test", category: "Bug or issue", message: "This is a test concern from the automated suite.", to: "attacker@example.test" } });
  assert.equal(good.status, 201);
  assert.equal(good.json.data.saved, true);
});
