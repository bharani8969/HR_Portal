import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export const BASE = process.env.TEST_API || "http://localhost:5000/api/v1";
const ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

export class Client {
  jar = {};
  async call(path, { method = "GET", body, form, raw } = {}) {
    const headers = { Origin: ORIGIN, Cookie: Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ") };
    if (!form) headers["Content-Type"] = "application/json";
    if (this.jar.hrms_csrf) headers["X-CSRF-Token"] = this.jar.hrms_csrf;
    const r = await fetch(BASE + path, { method, headers, body: form ?? (body && JSON.stringify(body)) });
    for (const c of r.headers.getSetCookie()) { const kv = c.split(";")[0]; const i = kv.indexOf("="); this.jar[kv.slice(0, i)] = kv.slice(i + 1); }
    if (raw) return { status: r.status, buf: Buffer.from(await r.arrayBuffer()), headers: r.headers };
    return { status: r.status, json: await r.json().catch(() => ({})) };
  }
}
// Needs: API running (EMAIL_DRIVER=console so inviteLink is returned) and a seeded admin. Works with any STORAGE_DRIVER (db, local, s3).
export async function loginAdmin() {
  const admin = new Client();
  const r = await admin.call("/auth/login", { method: "POST", body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
  assert.equal(r.status, 200, "admin login failed (set ADMIN_EMAIL / ADMIN_PASSWORD)");
  return admin;
}
export async function makeHr(admin, tag) {
  const c = new Client(), email = `${tag}-${randomUUID().slice(0, 8)}@example.test`, password = `Tmp-${randomUUID()}-Aa1`;
  const r = await admin.call("/admin/hr-users", { method: "POST", body: { name: `Test ${tag}`, email } });
  assert.equal(r.status, 201);
  const token = new URL(r.json.data.inviteLink).searchParams.get("token");
  assert.equal((await new Client().call("/auth/reset-password", { method: "POST", body: { token, newPassword: password } })).status, 200);
  assert.equal((await c.call("/auth/login", { method: "POST", body: { email, password } })).status, 200);
  return { client: c, user: r.json.data.user, email, password, token };
}
export const pdfForm = (name = "x.pdf", body = "%PDF-1.4\n% synthetic test document\n", extra = {}) => {
  const f = new FormData();
  f.append("file", new Blob([body]), name);
  for (const [k, v] of Object.entries({ category: "CV", ...extra })) f.append(k, v);
  return f;
};
