import { Router } from "express";
import crypto from "node:crypto";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { audit } from "../auth/audit.js";
import { CATEGORIES, REQUIRED, validateUpload, safeFileName } from "../../utils/files.js";
import { scan } from "../../services/scanService.js";
import { putObject, getObject, storesInDatabase } from "../../services/storageService.js";
import { encryptBytes } from "../../services/encryptionService.js";
import { uuid, ok, fail, wrap } from "../../utils/helpers.js";

const router = Router();
const guard = [authenticate, authorize("HR")]; // Admin has no document access in the initial release
const uid = z.string().uuid();
const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_FILE_MB * 1024 * 1024, files: 1 } });
const single = (req, res, next) => up.single("file")(req, res, (err) =>
  err ? res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json(fail(err.code === "LIMIT_FILE_SIZE" ? `File exceeds ${env.MAX_FILE_MB} MB` : "Invalid upload")) : next());
const notFound = (res) => res.status(404).json(fail("Not found"));

// Ownership is part of the query: employee must be assigned to the session user and not archived.
const ownedEmployee = (req, id) => prisma.employee.findFirst({ where: { id, assignedHrUserId: req.user.id, archivedAt: null } });
const ownedDoc = (req, id) => prisma.employeeDocument.findFirst({ where: { id, employee: { assignedHrUserId: req.user.id, archivedAt: null } } });

async function addVersion(req, { emp, doc, category, slot, displayName }) {
  const buf = req.file.buffer;
  const v = validateUpload(category, buf);
  if (!v.ok) return { s: 422, m: v.error };
  const scanStatus = await scan(buf); // PENDING until this returns; non-CLEAN files are never stored or served
  const docId = doc?.id ?? uuid(), versionId = uuid();
  const checksum = crypto.createHash("sha256").update(buf).digest("hex");
  let storageKey = "";
  if (scanStatus === "CLEAN") {
    if (storesInDatabase()) storageKey = `db:${versionId}`; // content is written inside the transaction below
    else {
      storageKey = `employees/${emp.id}/${docId}/${versionId}.${v.type.ext}`;
      await putObject(storageKey, buf); // new immutable object per version
    }
  }
  await prisma.$transaction(async (tx) => {
    if (!doc) doc = await tx.employeeDocument.create({ data: { id: docId, employeeId: emp.id, documentType: category, documentName: displayName ?? CATEGORIES[category].label, categorySlotKey: slot, status: "PENDING", uploadedByUserId: req.user.id } });
    const last = await tx.documentVersion.aggregate({ where: { documentId: docId }, _max: { versionNumber: true } });
    await tx.documentVersion.create({ data: { id: versionId, documentId: docId, versionNumber: (last._max.versionNumber ?? 0) + 1, storageKey, originalFileName: safeFileName(req.file.originalname), verifiedMimeType: v.type.mime, fileSize: buf.length, checksum, scanStatus, uploadedByUserId: req.user.id } });
    if (scanStatus === "CLEAN" && storesInDatabase()) await tx.documentBlob.create({ data: { versionId, data: encryptBytes(buf) } });
    if (scanStatus === "CLEAN") await tx.employeeDocument.update({ where: { id: docId }, data: { currentVersionId: versionId, status: "ACTIVE" } });
    else if (!doc.currentVersionId) await tx.employeeDocument.update({ where: { id: docId }, data: { status: scanStatus === "INFECTED" ? "REJECTED" : "FAILED" } });
  }, { maxWait: 10000, timeout: 30000 }); // large files need more than Prisma's 5 s default
  await audit(req.user.id, scanStatus === "CLEAN" ? "DOCUMENT_UPLOADED" : scanStatus === "INFECTED" ? "SECURITY_INFECTED_UPLOAD" : "DOCUMENT_SCAN_FAILED", "document", docId, req.ip, { category, checksum });
  if (scanStatus === "INFECTED") return { s: 422, m: "File failed the security scan and was rejected" };
  if (scanStatus === "FAILED") return { s: 503, m: "Security scan unavailable. Please try again." };
  return { s: 201, data: { id: docId, version: versionId } };
}
const reply = (res, r) => res.status(r.s).json(r.s === 201 ? ok(r.data) : fail(r.m));

router.get("/employees/:id/documents", ...guard, wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return notFound(res);
  const emp = await ownedEmployee(req, req.params.id); if (!emp) return notFound(res);
  const docs = await prisma.employeeDocument.findMany({ where: { employeeId: emp.id, status: { not: "ARCHIVED" } }, orderBy: { createdAt: "asc" } });
  const vers = await prisma.documentVersion.findMany({ where: { id: { in: docs.map((d) => d.currentVersionId).filter(Boolean) } } });
  const vm = new Map(vers.map((v) => [v.id, v]));
  const items = docs.map((d) => { const v = vm.get(d.currentVersionId); return { id: d.id, category: d.documentType, name: d.documentName, status: d.status, hasFile: !!v, mime: v?.verifiedMimeType ?? null, size: v?.fileSize ?? null, uploadedAt: v?.uploadedAt ?? null }; });
  const done = REQUIRED.filter((c) => items.some((i) => i.category === c && i.status === "ACTIVE")).length;
  res.json(ok({ items, completion: { done, total: REQUIRED.length } }));
}));

router.post("/employees/:id/documents", ...guard, single, wrap(async (req, res) => {
  const b = z.object({ category: z.enum(Object.keys(CATEGORIES)), name: z.string().trim().min(1).max(100).optional() }).safeParse(req.body);
  if (!uid.safeParse(req.params.id).success || !b.success || !req.file) return res.status(400).json(fail("Choose a category and a file"));
  const emp = await ownedEmployee(req, req.params.id); if (!emp) return notFound(res);
  const { category, name } = b.data;
  if (category === "ADDITIONAL" && !name) return res.status(422).json(fail("A display name is required for additional documents"));
  const slot = category === "ADDITIONAL" ? `ADDITIONAL:${uuid()}` : category;
  const doc = category === "ADDITIONAL" ? null : await prisma.employeeDocument.findUnique({ where: { employeeId_categorySlotKey: { employeeId: emp.id, categorySlotKey: slot } } });
  if (doc?.status === "ACTIVE") return res.status(409).json(fail("Already uploaded. Upload a new version to replace it."));
  reply(res, await addVersion(req, { emp, doc, category, slot, displayName: name }));
}));

router.post("/documents/:id/versions", ...guard, single, wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success || !req.file) return res.status(400).json(fail("Choose a file"));
  const doc = await ownedDoc(req, req.params.id); if (!doc) return notFound(res);
  const emp = await ownedEmployee(req, doc.employeeId);
  reply(res, await addVersion(req, { emp, doc, category: doc.documentType, slot: doc.categorySlotKey }));
}));

router.get("/documents/:id", ...guard, wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return notFound(res);
  const d = await ownedDoc(req, req.params.id); if (!d) return notFound(res);
  res.json(ok({ id: d.id, category: d.documentType, name: d.documentName, status: d.status }));
}));

router.get("/documents/:id/versions", ...guard, wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return notFound(res);
  const d = await ownedDoc(req, req.params.id); if (!d) return notFound(res);
  const v = await prisma.documentVersion.findMany({ where: { documentId: d.id }, orderBy: { versionNumber: "desc" } });
  res.json(ok({ items: v.map((x) => ({ id: x.id, version: x.versionNumber, fileName: x.originalFileName, size: x.fileSize, scanStatus: x.scanStatus, uploadedAt: x.uploadedAt, current: x.id === d.currentVersionId })) }));
}));

// Fresh authorization on every download; streamed through the API, never a public URL.
router.get("/documents/:id/download", ...guard, wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return notFound(res);
  const d = await ownedDoc(req, req.params.id);
  if (!d || !d.currentVersionId || d.status !== "ACTIVE") return notFound(res);
  const v = await prisma.documentVersion.findUnique({ where: { id: d.currentVersionId } });
  if (!v || v.scanStatus !== "CLEAN" || !v.storageKey) return notFound(res);
  const data = await getObject(v.storageKey);
  await audit(req.user.id, "DOCUMENT_DOWNLOADED", "document", d.id, req.ip, { version: v.versionNumber });
  res.set({
    "Content-Type": v.verifiedMimeType, "Content-Length": data.length, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store",
    "Content-Disposition": `${req.query.inline === "1" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(v.originalFileName)}`,
  }).send(data);
}));

// Archive keeps all versions and history (retention policy is a deferred business decision).
router.delete("/documents/:id", ...guard, wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return notFound(res);
  const d = await ownedDoc(req, req.params.id); if (!d) return notFound(res);
  await prisma.employeeDocument.update({ where: { id: d.id }, data: { status: "ARCHIVED" } });
  await audit(req.user.id, "DOCUMENT_ARCHIVED", "document", d.id, req.ip);
  res.json(ok({ archived: true }));
}));

export default router;
