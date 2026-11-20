import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { audit } from "../auth/audit.js";
import { encrypt, decrypt, last4, KEY_VERSION } from "../../services/encryptionService.js";
import { uuid, ok, fail, wrap, zodFail, fieldsFail } from "../../utils/helpers.js";
import { activeDefs } from "../customFields/defs.js";
import { checkCustom, mergeCustom } from "../customFields/custom.js";

const router = Router();
router.use(authenticate, authorize("HR")); // initial release: only HR manages employees

const s = (n) => z.string().trim().max(n).optional();
const profile = z.object({
  firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80),
  dob: z.coerce.date().optional(), gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  personalMobile: s(20), emergencyContact: s(20), personalEmail: z.string().email().optional(),
  currentAddress: s(500), permanentAddress: s(500),
  dateOfJoining: z.coerce.date().optional(), departmentId: z.string().uuid().optional(), designationId: z.string().uuid().optional(),
  reportingManager: s(100), officialEmail: z.string().email().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).optional(),
  customData: z.record(z.string(), z.union([z.string(), z.number()])).optional(), // validated against Admin-defined fields
}); // unknown keys (assignedHrUserId, createdByUserId, ...) are stripped by zod: ownership is never client-controlled
// ASSUMPTION (deferred decision): default required fields to submit an employee as COMPLETE. Confirm with the project owner.
const REQUIRED = ["dob", "gender", "personalMobile", "dateOfJoining", "departmentId", "designationId", "employmentType"];
const sensitive = z.object({
  aadhaar: z.string().regex(/^\d{12}$/).optional(), pan: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/).optional(),
  uan: z.string().regex(/^\d{12}$/).optional(), bankAccount: z.string().regex(/^\d{6,18}$/).optional(),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional(), bankName: s(100),
});
const listQ = z.object({
  page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().max(100).optional(), registration: z.enum(["DRAFT", "COMPLETE"]).optional(),
  departmentId: z.string().uuid().optional(), sort: z.enum(["newest", "name"]).default("newest"),
});
const uid = z.string().uuid();
const bad = (res) => res.status(400).json(fail("Invalid request"));
const notFound = (res) => res.status(404).json(fail("Not found"));
const mask = (v) => (v ? `••••${v}` : null);
const include = { department: { select: { name: true } }, designation: { select: { name: true } }, sensitive: { select: { aadhaarLast4: true, panLast4: true, uanLast4: true, bankLast4: true, ifsc: true, bankName: true } } };

// Ownership is enforced IN the query: assigned HR = session user, not archived.
const mine = (req, id) => prisma.employee.findFirst({ where: { id, assignedHrUserId: req.user.id, archivedAt: null } });
const view = ({ sensitive: x, department, designation, createdByUserId, assignedHrUserId, ...e }) => ({
  ...e, department: department?.name ?? null, designation: designation?.name ?? null,
  sensitive: { aadhaar: mask(x?.aadhaarLast4), pan: mask(x?.panLast4), uan: mask(x?.uanLast4), bankAccount: mask(x?.bankLast4), ifsc: x?.ifsc ?? null, bankName: x?.bankName ?? null },
});

router.get("/", wrap(async (req, res) => {
  const p = listQ.safeParse(req.query); if (!p.success) return bad(res);
  const { page, pageSize, q, registration, departmentId, sort } = p.data;
  const where = { assignedHrUserId: req.user.id, archivedAt: null, ...(registration && { registrationStatus: registration }), ...(departmentId && { departmentId }),
    ...(q && { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { employeeCode: { contains: q } }] }) };
  const [items, total] = await Promise.all([
    prisma.employee.findMany({ where, include, orderBy: sort === "name" ? [{ firstName: "asc" }, { lastName: "asc" }] : { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.employee.count({ where }),
  ]);
  res.json(ok({ items: items.map(view), total, page, pageSize }));
}));

router.post("/", wrap(async (req, res) => {
  const p = profile.safeParse(req.body); if (!p.success) return zodFail(res, p.error);
  const defs = await activeDefs();
  const ce = checkCustom(p.data.customData, defs); if (ce) return fieldsFail(res, ce);
  const { customData, ...rest } = p.data;
  const emp = await prisma.$transaction(async (tx) => {
    const c = await tx.counter.upsert({ where: { key: "employee_code" }, update: { value: { increment: 1 } }, create: { key: "employee_code", value: 1 } });
    return tx.employee.create({ data: { ...rest, customData: mergeCustom({}, customData, defs), id: uuid(), employeeCode: `EMP${String(c.value).padStart(6, "0")}`, registrationStatus: "DRAFT", createdByUserId: req.user.id, assignedHrUserId: req.user.id }, include });
  });
  await audit(req.user.id, "EMPLOYEE_CREATED", "employee", emp.id, req.ip);
  res.status(201).json(ok({ employee: view(emp) }));
}));

router.get("/:id", wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return bad(res);
  const e = await prisma.employee.findFirst({ where: { id: req.params.id, assignedHrUserId: req.user.id, archivedAt: null }, include });
  if (!e) return notFound(res);
  res.json(ok({ employee: view(e) }));
}));

router.put("/:id", wrap(async (req, res) => {
  const p = profile.partial().extend({ submit: z.boolean().optional() }).safeParse(req.body);
  if (!uid.safeParse(req.params.id).success) return bad(res);
  if (!p.success) return zodFail(res, p.error);
  const cur = await mine(req, req.params.id); if (!cur) return notFound(res);
  const { submit, customData, ...data } = p.data;
  const defs = await activeDefs();
  const ce = checkCustom(customData, defs); if (ce) return fieldsFail(res, ce);
  const mergedCustom = mergeCustom(cur.customData ?? {}, customData, defs);
  if (customData !== undefined) data.customData = mergedCustom;
  if (submit) {
    const merged = { ...cur, ...data };
    const errs = {};
    for (const k of REQUIRED) if (merged[k] == null) errs[k] = "Required to submit";
    Object.assign(errs, checkCustom(mergedCustom, defs, { requireAll: true, skipUnknown: true }) ?? {});
    if (Object.keys(errs).length) return fieldsFail(res, errs);
    data.registrationStatus = "COMPLETE";
  }
  const e = await prisma.employee.update({ where: { id: cur.id }, data, include });
  await audit(req.user.id, submit ? "EMPLOYEE_SUBMITTED" : "EMPLOYEE_UPDATED", "employee", e.id, req.ip);
  res.json(ok({ employee: view(e) }));
}));

router.patch("/:id/status", wrap(async (req, res) => {
  const b = z.object({ employmentStatus: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "EXITED"]) }).safeParse(req.body);
  if (!uid.safeParse(req.params.id).success || !b.success) return bad(res);
  const cur = await mine(req, req.params.id); if (!cur) return notFound(res);
  const e = await prisma.employee.update({ where: { id: cur.id }, data: b.data, include });
  await audit(req.user.id, "EMPLOYEE_STATUS_CHANGED", "employee", e.id, req.ip, { to: b.data.employmentStatus });
  res.json(ok({ employee: view(e) }));
}));

// Soft delete only. ASSUMPTION (deferred): HR may archive own employees; approval policy to be confirmed.
router.delete("/:id", wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return bad(res);
  const cur = await mine(req, req.params.id); if (!cur) return notFound(res);
  await prisma.employee.update({ where: { id: cur.id }, data: { archivedAt: new Date() } });
  await audit(req.user.id, "EMPLOYEE_ARCHIVED", "employee", cur.id, req.ip);
  res.json(ok({ archived: true }));
}));

router.get("/:id/sensitive-data", wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return bad(res);
  const cur = await mine(req, req.params.id); if (!cur) return notFound(res);
  const x = await prisma.employeeSensitiveData.findUnique({ where: { employeeId: cur.id } });
  const d = (b) => (b ? decrypt(b) : null);
  await audit(req.user.id, "SENSITIVE_DATA_READ", "employee", cur.id, req.ip); // audited without values
  res.json(ok({ aadhaar: d(x?.aadhaarEnc), pan: d(x?.panEnc), uan: d(x?.uanEnc), bankAccount: d(x?.bankAccountEnc), ifsc: x?.ifsc ?? null, bankName: x?.bankName ?? null }));
}));

router.put("/:id/sensitive-data", wrap(async (req, res) => {
  const p = sensitive.safeParse(req.body);
  if (!uid.safeParse(req.params.id).success) return bad(res);
  if (!p.success) return zodFail(res, p.error, { aadhaar: "Aadhaar must be 12 digits", pan: "PAN format: ABCDE1234F", uan: "UAN must be 12 digits", bankAccount: "Account number must be 6 to 18 digits", ifsc: "IFSC format: ABCD0123456" });
  const cur = await mine(req, req.params.id); if (!cur) return notFound(res);
  const { aadhaar, pan, uan, bankAccount, ifsc, bankName } = p.data;
  const set = {
    ...(aadhaar && { aadhaarEnc: encrypt(aadhaar), aadhaarLast4: last4(aadhaar) }), ...(pan && { panEnc: encrypt(pan), panLast4: last4(pan) }),
    ...(uan && { uanEnc: encrypt(uan), uanLast4: last4(uan) }), ...(bankAccount && { bankAccountEnc: encrypt(bankAccount), bankLast4: last4(bankAccount) }),
    ...(ifsc && { ifsc }), ...(bankName && { bankName }), keyVersion: KEY_VERSION,
  };
  await prisma.employeeSensitiveData.upsert({ where: { employeeId: cur.id }, update: set, create: { id: uuid(), employeeId: cur.id, ...set } });
  await audit(req.user.id, "SENSITIVE_DATA_UPDATED", "employee", cur.id, req.ip, { fields: Object.keys(p.data) }); // field names only
  res.json(ok({ saved: true }));
}));

export default router;
