import "./setup.js";
process.env.EMAIL_DRIVER = "resend";
process.env.RESEND_API_KEY = "re_test_key_123";
process.env.EMAIL_FROM = "HR Portal <no-reply@example.com>";
process.env.CLIENT_NAME = "HR Portal";
import test from "node:test";
import assert from "node:assert/strict";
const { deliver, isReady, providerName } = await import("../../src/services/emailProviders.js");
const { renderEmail, esc } = await import("../../src/services/emailTemplates.js");

const realFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = realFetch; });

test("Resend request: URL, auth header, JSON body, reply-to, multiple recipients", async () => {
  let seen;
  globalThis.fetch = async (url, init) => { seen = { url, init, body: JSON.parse(init.body) }; return new Response(JSON.stringify({ id: "em_123" }), { status: 200 }); };
  const r = await deliver({ to: ["a@x.com", "b@x.com"], subject: "Hello", text: "plain", html: "<p>html</p>", replyTo: "user@x.com" });
  assert.deepEqual(r, { sent: true, id: "em_123" });
  assert.equal(seen.url, "https://api.resend.com/emails");
  assert.equal(seen.init.method, "POST");
  assert.equal(seen.init.headers.Authorization, "Bearer re_test_key_123");
  assert.deepEqual(seen.body, { from: "HR Portal <no-reply@example.com>", to: ["a@x.com", "b@x.com"], subject: "Hello", text: "plain", html: "<p>html</p>", reply_to: "user@x.com" });
  assert.equal(providerName(), "resend"); assert.equal(isReady(), true);
});
test("a single address is sent as a list", async () => {
  let body; globalThis.fetch = async (_u, init) => { body = JSON.parse(init.body); return new Response("{}", { status: 200 }); };
  await deliver({ to: "one@x.com", subject: "s", text: "t" });
  assert.deepEqual(body.to, ["one@x.com"]); assert.equal(body.reply_to, undefined); assert.equal(body.html, undefined);
});
test("provider errors surface the provider's own message (e.g. unverified domain)", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "The example.com domain is not verified." }), { status: 403 });
  await assert.rejects(() => deliver({ to: ["a@x.com"], subject: "s", text: "t" }), /domain is not verified/);
  globalThis.fetch = async () => new Response("not json", { status: 500 });
  await assert.rejects(() => deliver({ to: ["a@x.com"], subject: "s", text: "t" }), /HTTP 500/);
});
test("branded email escapes user text, rejects non-http links, includes branding", () => {
  const evil = `<img src=x onerror=alert(1)> & "quotes"`;
  const { html, text } = renderEmail({ title: evil, lines: [evil], quote: evil, button: { label: "Go", url: "javascript:alert(1)" } });
  assert.ok(!html.includes("<img"), "raw HTML must not appear");
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(!html.includes("javascript:"), "unsafe link dropped");
  assert.ok(html.includes("HR Portal") && html.includes("Powered by TREZION Technology"));
  const ok = renderEmail({ title: "T", button: { label: "Reset", url: "https://app.example.com/reset?token=abc&x=1" } });
  assert.ok(ok.html.includes('href="https://app.example.com/reset?token=abc&amp;x=1"'));
  assert.ok(ok.text.includes("Reset: https://app.example.com/reset?token=abc&x=1"), "plain-text version keeps the real link");
  assert.equal(esc("<&>\"'"), "&lt;&amp;&gt;&quot;&#39;");
});
