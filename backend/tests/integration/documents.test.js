import test from "node:test";
import assert from "node:assert/strict";
import { loginAdmin, makeHr, pdfForm } from "./helpers.js";

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$" + "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

test("documents: validation, scanning, versioning, cross-HR denial, transfer", async () => {
  const admin = await loginAdmin();
  const A = await makeHr(admin, "doca"), B = await makeHr(admin, "docb");
  const id = (await A.client.call("/employees", { method: "POST", body: { firstName: "Doc", lastName: "Test" } })).json.data.employee.id;
  const up = (c, form) => c.call(`/employees/${id}/documents`, { method: "POST", form });

  assert.equal((await up(A.client, pdfForm("cv.pdf", "MZ not really a pdf"))).status, 422, "spoofed type rejected");
  const bad = await up(A.client, pdfForm("cv.pdf", "%PDF-1.4\n" + EICAR));
  assert.equal(bad.status, 422, "infected file rejected");
  const listBad = (await A.client.call(`/employees/${id}/documents`)).json.data;
  assert.equal(listBad.items[0].status, "REJECTED");
  assert.equal(listBad.items[0].hasFile, false, "infected file is never available");
  assert.equal((await A.client.call(`/documents/${listBad.items[0].id}/download`, { raw: true })).status, 404);

  const ok1 = await up(A.client, pdfForm("cv.pdf", "%PDF-1.4\n% version one\n"));
  assert.equal(ok1.status, 201);
  const docId = ok1.json.data.id;
  assert.equal((await up(A.client, pdfForm("cv2.pdf"))).status, 409, "second upload must be a new version");
  assert.equal((await A.client.call(`/documents/${docId}/versions`, { method: "POST", form: pdfForm("cv-v2.pdf", "%PDF-1.4\n% version two\n") })).status, 201);
  const vers = (await A.client.call(`/documents/${docId}/versions`)).json.data.items;
  assert.equal(vers.length, 2);
  assert.equal(vers.filter((v) => v.current).length, 1);

  const dl = await A.client.call(`/documents/${docId}/download`, { raw: true });
  assert.equal(dl.status, 200);
  assert.match(dl.buf.toString(), /version two/);
  assert.equal(dl.headers.get("x-content-type-options"), "nosniff");

  for (const [p, m, f] of [[`/documents/${docId}/download`, "GET"], [`/documents/${docId}`, "GET"], [`/documents/${docId}/versions`, "GET"],
    [`/documents/${docId}/versions`, "POST", pdfForm()], [`/documents/${docId}`, "DELETE"], [`/employees/${id}/documents`, "POST", pdfForm("x.pdf", "%PDF-1.4\n", { category: "AADHAAR" })]])
    assert.equal((await B.client.call(p, { method: m, form: f, raw: m === "GET" && p.endsWith("download") })).status, 404, `B: ${m} ${p}`);
  assert.equal((await admin.call(`/documents/${docId}/download`, { raw: true })).status, 403, "admin has no document access by default");

  assert.equal((await up(A.client, pdfForm("a.pdf", "%PDF-1.4\n", { category: "ADDITIONAL" }))).status, 422, "additional docs need a name");
  assert.equal((await up(A.client, pdfForm("a.pdf", "%PDF-1.4\n", { category: "ADDITIONAL", name: "Certificate 1" }))).status, 201);
  assert.equal((await up(A.client, pdfForm("b.pdf", "%PDF-1.4\n", { category: "ADDITIONAL", name: "Certificate 2" }))).status, 201, "multiple additional docs allowed");
  assert.equal((await A.client.call(`/employees/${id}/documents`)).json.data.completion.done, 1);

  // Admin transfers to B: B gains access, A loses it, history stays.
  assert.equal((await admin.call(`/admin/employees/${id}/transfer`, { method: "POST", body: { newHrId: B.user.id, reason: "test" } })).status, 200);
  assert.equal((await A.client.call(`/employees/${id}`)).status, 404);
  assert.equal((await B.client.call(`/employees/${id}`)).status, 200);
  assert.equal((await B.client.call(`/documents/${docId}/download`, { raw: true })).status, 200);
  assert.ok((await admin.call("/admin/transfers")).json.data.items.length >= 1);
});
