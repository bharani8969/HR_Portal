import test from "node:test";
import assert from "node:assert/strict";
import { Client, loginAdmin, makeHr } from "./helpers.js";

test("Admin manages destination emails; concern form follows; test send and delivery log", async () => {
  const admin = await loginAdmin(), hr = await makeHr(admin, "mail");
  const settings = await admin.call("/admin/email/settings");
  assert.equal(settings.status, 200);
  assert.ok(Array.isArray(settings.json.data.recipients) && settings.json.data.recipients.length >= 1);

  const bad = await admin.call("/admin/email/settings", { method: "PUT", body: { recipients: ["good@example.test", "nope"] } });
  assert.equal(bad.status, 422); assert.match(bad.json.error.fields.recipients, /not a valid email/);
  assert.equal((await admin.call("/admin/email/settings", { method: "PUT", body: { recipients: [] } })).status, 422, "at least one destination is required");

  const mine = ["ops-" + Date.now() + "@example.test", "second@example.test"];
  assert.equal((await admin.call("/admin/email/settings", { method: "PUT", body: { recipients: mine } })).status, 200);
  const info = await new Client().call("/support/info");   // public: shows where concerns will go
  assert.equal(info.json.data.to, mine.join(", "));

  const test = await admin.call("/admin/email/test", { method: "POST", body: { to: "tester@example.test" } });
  assert.equal(test.status, 200); assert.ok("sent" in test.json.data);
  assert.equal((await admin.call("/admin/email/test", { method: "POST", body: { to: "not-an-email" } })).status, 422, "address error is reported per field");

  const logs = await admin.call("/admin/email/logs");
  assert.equal(logs.status, 200);
  assert.ok(logs.json.data.items.some((l) => l.type === "TEST"), "the test email is recorded");
  assert.ok(logs.json.data.items.every((l) => !("text" in l) && !("html" in l) && !("body" in l)), "message contents are never stored");

  for (const [p, m, b] of [["/admin/email/settings", "GET"], ["/admin/email/settings", "PUT", { recipients: ["x@example.test"] }], ["/admin/email/test", "POST", { to: "x@example.test" }], ["/admin/email/logs", "GET"]])
    assert.equal((await hr.client.call(p, { method: m, body: b })).status, 403, `HR must not reach ${m} ${p}`);
});

test("HR invitation reports whether the email went out and gives the Admin a fallback link", async () => {
  const admin = await loginAdmin();
  const r = await admin.call("/admin/hr-users", { method: "POST", body: { name: "Invite Check", email: `inv-${Date.now()}@example.test` } });
  assert.equal(r.status, 201);
  assert.equal(typeof r.json.data.emailed, "boolean");
  if (!r.json.data.emailed) assert.match(r.json.data.inviteLink, /reset-password\?token=/, "no email sent => Admin gets the link");
});
