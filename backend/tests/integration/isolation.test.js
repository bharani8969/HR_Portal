import test from "node:test";
import assert from "node:assert/strict";
import { Client, loginAdmin, makeHr, BASE } from "./helpers.js";

test("HR B cannot read/change HR A's employee; ownership cannot be spoofed; deactivation revokes sessions", async () => {
  const admin = await loginAdmin();
  const A = await makeHr(admin, "hra"), B = await makeHr(admin, "hrb");
  const created = await A.client.call("/employees", { method: "POST", body: { firstName: "Synthetic", lastName: "Person" } });
  assert.equal(created.status, 201);
  const id = created.json.data.employee.id;

  for (const [path, method, body] of [[`/employees/${id}`, "GET"], [`/employees/${id}`, "PUT", { firstName: "Hacked" }], [`/employees/${id}/sensitive-data`, "GET"],
    [`/employees/${id}/sensitive-data`, "PUT", { pan: "ABCDE1234F" }], [`/employees/${id}/documents`, "GET"], [`/employees/${id}`, "DELETE"]])
    assert.equal((await B.client.call(path, { method, body })).status, 404, `${method} ${path}`);
  assert.ok(!(await B.client.call("/employees")).json.data.items.some((e) => e.id === id));

  const spoof = await B.client.call("/employees", { method: "POST", body: { firstName: "Spoof", lastName: "Try", assignedHrUserId: A.user.id, createdByUserId: A.user.id } });
  assert.equal((await A.client.call(`/employees/${spoof.json.data.employee.id}`)).status, 404);

  assert.equal((await A.client.call("/admin/hr-users")).status, 403, "HR must not reach admin routes");
  assert.equal((await admin.call("/employees")).status, 403, "Admin must not use HR employee routes");
  assert.equal((await admin.call(`/admin/hr-users/${B.user.id}/status`, { method: "PATCH", body: { status: "INACTIVE" } })).status, 200);
  assert.equal((await B.client.call("/employees")).status, 401);
  assert.equal((await new Client().call("/auth/login", { method: "POST", body: { email: B.email, password: B.password } })).status, 401);
});

test("session, CSRF and generic-error protections", async () => {
  const admin = await loginAdmin();
  const A = await makeHr(admin, "hrc");
  const noCsrf = await fetch(BASE + "/employees", { method: "POST", headers: { "Content-Type": "application/json", Origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173", Cookie: Object.entries(A.client.jar).filter(([k]) => k !== "hrms_csrf").map(([k, v]) => `${k}=${v}`).join("; ") }, body: JSON.stringify({ firstName: "a", lastName: "b" }) });
  assert.equal(noCsrf.status, 403, "missing CSRF token must be rejected");
  const badOrigin = await fetch(BASE + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" }, body: "{}" });
  assert.equal(badOrigin.status, 403, "foreign Origin must be rejected");
  const wrong = await new Client().call("/auth/login", { method: "POST", body: { email: A.email, password: "wrong-password-123" } });
  const none = await new Client().call("/auth/login", { method: "POST", body: { email: "nobody@example.test", password: "wrong-password-123" } });
  assert.equal(wrong.json.error.message, none.json.error.message, "unknown user and wrong password must look identical");
  assert.equal((await A.client.call("/auth/logout", { method: "POST" })).status, 200);
  assert.equal((await A.client.call("/auth/me")).status, 401);
  const stale = await new Client().call("/auth/reset-password", { method: "POST", body: { token: A.token, newPassword: "Another-Long-Passw0rd" } });
  assert.equal(stale.status, 400, "reset/invite token is single-use");
});
