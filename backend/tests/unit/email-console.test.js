import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
const { deliver, isReady } = await import("../../src/services/emailProviders.js");

test("console driver (development) prints and reports not sent", async () => {
  const logs = []; const orig = console.log; console.log = (...a) => logs.push(a.join(" "));
  try { const r = await deliver({ to: ["a@x.com"], subject: "Hi", text: "body link" }); assert.deepEqual(r, { sent: false }); } finally { console.log = orig; }
  assert.ok(logs.join("\n").includes("a@x.com") && logs.join("\n").includes("body link"));
  assert.equal(isReady(), false);
});
