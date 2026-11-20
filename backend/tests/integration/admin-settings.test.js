import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Client, loginAdmin, makeHr } from "./helpers.js";

const tag = () => randomUUID().slice(0, 6);

test("Admin manages departments; HR dropdown follows; duplicates get a field error", async () => {
  const admin = await loginAdmin(), hr = await makeHr(admin, "dept");
  const name = `Dept-${tag()}`;
  const c = await admin.call("/admin/departments", { method: "POST", body: { name } });
  assert.equal(c.status, 201);
  const dup = await admin.call("/admin/departments", { method: "POST", body: { name } });
  assert.equal(dup.status, 409);
  assert.ok(dup.json.error.fields.name, "duplicate shown under the Name field");
  assert.equal((await admin.call("/admin/departments", { method: "POST", body: { name: "" } })).json.error.fields.name, "This field is required");
  assert.equal((await admin.call(`/admin/departments/${c.json.data.id}/designations`, { method: "POST", body: { name: "Lead" } })).status, 201);
  const seen = (await hr.client.call("/departments")).json.data.items.find((d) => d.name === name);
  assert.ok(seen && seen.designations.some((g) => g.name === "Lead"));
  assert.equal((await hr.client.call("/admin/departments", { method: "POST", body: { name: "Nope" } })).status, 403);
  assert.equal((await admin.call(`/admin/departments/${c.json.data.id}`, { method: "DELETE" })).status, 200);
  assert.ok(!(await hr.client.call("/departments")).json.data.items.some((d) => d.name === name), "removed department leaves the dropdown");
});

test("Admin adds/removes form fields; server enforces them with per-field errors", async () => {
  const admin = await loginAdmin(), hr = await makeHr(admin, "cf");
  const f = await admin.call("/admin/custom-fields", { method: "POST", body: { label: `Shirt ${tag()}`, fieldType: "DROPDOWN", required: true, options: ["S", "M", "L"] } });
  assert.equal(f.status, 201);
  assert.equal((await admin.call("/admin/custom-fields", { method: "POST", body: { label: "Bad", fieldType: "DROPDOWN", options: ["Only"] } })).json.error.fields.options, "Add at least 2 options");
  const defs = (await hr.client.call("/custom-fields")).json.data.items;
  const key = defs.find((d) => d.id === f.json.data.id).fieldKey;

  const e1 = await hr.client.call("/employees", { method: "POST", body: { firstName: "", lastName: "" } });
  assert.equal(e1.status, 422);
  assert.equal(e1.json.error.fields.firstName, "This field is required");
  assert.equal(e1.json.error.fields.lastName, "This field is required");

  const badOpt = await hr.client.call("/employees", { method: "POST", body: { firstName: "A", lastName: "B", customData: { [key]: "XXL" } } });
  assert.equal(badOpt.json.error.fields[`customData.${key}`], "Choose a valid option");

  const ok1 = await hr.client.call("/employees", { method: "POST", body: { firstName: "A", lastName: "B" } });
  const id = ok1.json.data.employee.id;
  const sub = await hr.client.call(`/employees/${id}`, { method: "PUT", body: { submit: true } });
  assert.equal(sub.status, 422);
  assert.equal(sub.json.error.fields[`customData.${key}`], "This field is required");
  assert.equal(sub.json.error.fields.dob, "Required to submit");
  const saved = await hr.client.call(`/employees/${id}`, { method: "PUT", body: { customData: { [key]: "M" } } });
  assert.equal(saved.json.data.employee.customData[key], "M");

  assert.equal((await admin.call(`/admin/custom-fields/${f.json.data.id}`, { method: "DELETE" })).status, 200);
  assert.ok(!(await hr.client.call("/custom-fields")).json.data.items.some((d) => d.id === f.json.data.id), "removed field leaves the form");
  assert.equal((await hr.client.call(`/employees/${id}`)).json.data.employee.customData[key], "M", "saved value is kept");
});

test("sensitive-data formats are reported per field", async () => {
  const admin = await loginAdmin(), hr = await makeHr(admin, "fmt");
  const id = (await hr.client.call("/employees", { method: "POST", body: { firstName: "A", lastName: "B" } })).json.data.employee.id;
  const r = await hr.client.call(`/employees/${id}/sensitive-data`, { method: "PUT", body: { aadhaar: "123", pan: "bad", ifsc: "x" } });
  assert.equal(r.status, 422);
  assert.equal(r.json.error.fields.aadhaar, "Aadhaar must be 12 digits");
  assert.equal(r.json.error.fields.pan, "PAN format: ABCDE1234F");
  assert.ok(r.json.error.fields.ifsc);
});

test("multiple logins: several people, and one person on several devices, at once", async () => {
  const admin = await loginAdmin(), a = await makeHr(admin, "multia"), b = await makeHr(admin, "multib");
  const second = new Client(); // same user, another device/browser
  assert.equal((await second.call("/auth/login", { method: "POST", body: { email: a.email, password: a.password } })).status, 200);
  assert.equal((await a.client.call("/auth/me")).status, 200, "first device still signed in");
  assert.equal((await second.call("/auth/me")).status, 200);
  assert.equal((await b.client.call("/auth/me")).status, 200, "another user unaffected");
  assert.equal((await admin.call("/auth/me")).status, 200, "admin unaffected");
  await second.call("/auth/logout", { method: "POST" });
  assert.equal((await a.client.call("/auth/me")).status, 200, "logging out one device keeps the other");
});

test("delete HR and employee with safeguards", async () => {
  const admin = await loginAdmin(), hr = await makeHr(admin, "del");
  const emp = (await hr.client.call("/employees", { method: "POST", body: { firstName: "Del", lastName: "Me" } })).json.data.employee.id;
  const blocked = await admin.call(`/admin/hr-users/${hr.user.id}`, { method: "DELETE" });
  assert.equal(blocked.status, 409, "cannot delete an HR who still has employees");
  assert.match(blocked.json.error.message, /1 employee/);
  assert.equal((await admin.call(`/admin/employees/${emp}`, { method: "DELETE" })).status, 200);
  assert.equal((await hr.client.call(`/employees/${emp}`)).status, 404, "deleted employee is gone for HR");
  assert.equal((await admin.call(`/admin/hr-users/${hr.user.id}`, { method: "DELETE" })).status, 200);
  assert.equal((await hr.client.call("/employees")).status, 401, "deleted HR's session is revoked");
  assert.equal((await new Client().call("/auth/login", { method: "POST", body: { email: hr.email, password: hr.password } })).status, 401);
  const list = (await admin.call("/admin/hr-users?pageSize=100")).json.data.items;
  assert.ok(!list.some((h) => h.id === hr.user.id));
  assert.equal((await admin.call("/admin/hr-users", { method: "POST", body: { name: "Again", email: hr.email } })).status, 201, "email can be reused after delete");
});

test("custom fields can live in existing sections and be reordered", async () => {
  const admin = await loginAdmin(), hr = await makeHr(admin, "sec");
  const mk = (label, section) => admin.call("/admin/custom-fields", { method: "POST", body: { label: `${label} ${tag()}`, fieldType: "TEXT", section } });
  const a = await mk("Blood group", "PERSONAL"), b = await mk("Badge no", "PERSONAL"), c = await mk("Cost centre", "EMPLOYMENT");
  assert.ok([a, b, c].every((r) => r.status === 201));
  assert.equal((await admin.call("/admin/custom-fields", { method: "POST", body: { label: "Bad section", fieldType: "TEXT", section: "NOPE" } })).json.error.fields.section, "Choose a valid option");
  const defs = () => hr.client.call("/custom-fields").then((r) => r.json.data.items);
  const mine = (await defs()).filter((d) => [a, b, c].some((x) => x.json.data.id === d.id));
  assert.deepEqual(mine.map((d) => d.section).sort(), ["EMPLOYMENT", "PERSONAL", "PERSONAL"]);
  const order = async () => (await defs()).filter((d) => d.section === "PERSONAL").map((d) => d.id);
  const before = await order();
  const idB = b.json.data.id, posB = before.indexOf(idB);
  assert.equal((await admin.call(`/admin/custom-fields/${idB}/move`, { method: "POST", body: { direction: "up" } })).status, 200);
  const after = await order();
  assert.equal(after.indexOf(idB), posB - 1, "field moved up inside its section");
});
