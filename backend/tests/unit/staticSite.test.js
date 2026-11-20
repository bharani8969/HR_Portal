import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "site-"));
fs.mkdirSync(path.join(dir, "assets"));
fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html><title>app</title>");
fs.writeFileSync(path.join(dir, "assets", "app-abc123.js"), "console.log(1)");
process.env.STATIC_DIR = dir;
process.env.CLIENT_NAME = "Acme Corp";
process.env.BRAND_PRIMARY = "#112233";
const { mountFrontend } = await import("../../src/staticSite.js");

async function withServer(fn) {
  const app = express();
  app.get("/api/v1/ping", (_q, r) => r.json({ ok: true }));
  assert.equal(mountFrontend(app), true);
  app.use((_q, r) => r.status(404).json({ notFound: true }));
  const srv = app.listen(0); const base = `http://127.0.0.1:${srv.address().port}`;
  try { await fn(base); } finally { srv.close(); }
}

test("serves runtime branding, assets with long cache, SPA fallback; never swallows /api", async () => {
  await withServer(async (b) => {
    const brand = await fetch(b + "/brand.js");
    assert.match(brand.headers.get("content-type"), /javascript/);
    const js = await brand.text();
    assert.match(js, /window\.__BRAND__=/); assert.match(js, /Acme Corp/); assert.match(js, /#112233/);
    const asset = await fetch(b + "/assets/app-abc123.js");
    assert.equal(asset.status, 200); assert.match(asset.headers.get("cache-control"), /max-age=31536000/);
    for (const route of ["/", "/employees", "/admin/fields", "/reset-password"]) {
      const r = await fetch(b + route);
      assert.equal(r.status, 200, route); assert.match(await r.text(), /<title>app<\/title>/); assert.equal(r.headers.get("cache-control"), "no-cache");
    }
    assert.deepEqual(await (await fetch(b + "/api/v1/ping")).json(), { ok: true });
    const missingApi = await fetch(b + "/api/v1/does-not-exist");
    assert.equal(missingApi.status, 404); assert.deepEqual(await missingApi.json(), { notFound: true });
  });
});
