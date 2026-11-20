import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { audit } from "../auth/audit.js";
import { uuid, ok, fail, wrap, zodFail, fieldsFail } from "../../utils/helpers.js";

// Admin-managed master data: departments, designations and custom employee form fields.
const router = Router();
router.use(authenticate, authorize("ADMIN"));
const uid = z.string().uuid();
const name = z.object({ name: z.string().trim().min(2).max(80) });
const bad = (res) => res.status(400).json(fail("Invalid request"));
const nf = (res) => res.status(404).json(fail("Not found"));
const dupe = (res, label) => fieldsFail(res, { name: `${label} already exists` }, 409);

// ---- Departments ----
router.get("/departments", wrap(async (_req, res) => {
  const [deps, counts] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" }, include: { designations: { orderBy: { name: "asc" } } } }),
    prisma.employee.groupBy({ by: ["departmentId"], where: { archivedAt: null }, _count: { _all: true } }),
  ]);
  const c = new Map(counts.map((x) => [x.departmentId, x._count._all]));
  res.json(ok({ items: deps.map((d) => ({ id: d.id, name: d.name, status: d.status, employees: c.get(d.id) ?? 0, designations: d.designations.map((g) => ({ id: g.id, name: g.name, status: g.status })) })) }));
}));

router.post("/departments", wrap(async (req, res) => {
  const p = name.safeParse(req.body); if (!p.success) return zodFail(res, p.error);
  if (await prisma.department.findUnique({ where: { name: p.data.name } })) return dupe(res, "This department");
  const d = await prisma.department.create({ data: { id: uuid(), name: p.data.name } });
  await audit(req.user.id, "DEPARTMENT_CREATED", "department", d.id, req.ip);
  res.status(201).json(ok({ id: d.id }));
}));

router.put("/departments/:id", wrap(async (req, res) => {
  const p = name.safeParse(req.body);
  if (!uid.safeParse(req.params.id).success) return bad(res);
  if (!p.success) return zodFail(res, p.error);
  const d = await prisma.department.findUnique({ where: { id: req.params.id } }); if (!d) return nf(res);
  const other = await prisma.department.findUnique({ where: { name: p.data.name } });
  if (other && other.id !== d.id) return dupe(res, "This department");
  await prisma.department.update({ where: { id: d.id }, data: { name: p.data.name } });
  await audit(req.user.id, "DEPARTMENT_UPDATED", "department", d.id, req.ip);
  res.json(ok({ updated: true }));
}));

// "Delete" hides the department from dropdowns; employees already in it keep their record.
router.delete("/departments/:id", wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return bad(res);
  const d = await prisma.department.findUnique({ where: { id: req.params.id } }); if (!d) return nf(res);
  await prisma.department.update({ where: { id: d.id }, data: { status: "INACTIVE" } });
  await audit(req.user.id, "DEPARTMENT_REMOVED", "department", d.id, req.ip);
  res.json(ok({ removed: true }));
}));
router.post("/departments/:id/restore", wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return bad(res);
  const d = await prisma.department.findUnique({ where: { id: req.params.id } }); if (!d) return nf(res);
  await prisma.department.update({ where: { id: d.id }, data: { status: "ACTIVE" } });
  res.json(ok({ restored: true }));
}));

router.post("/departments/:id/designations", wrap(async (req, res) => {
  const p = name.safeParse(req.body);
  if (!uid.safeParse(req.params.id).success) return bad(res);
  if (!p.success) return zodFail(res, p.error);
  const d = await prisma.department.findUnique({ where: { id: req.params.id } }); if (!d) return nf(res);
  const ex = await prisma.designation.findFirst({ where: { departmentId: d.id, name: p.data.name } });
  if (ex?.status === "ACTIVE") return dupe(res, "This designation");
  if (ex) await prisma.designation.update({ where: { id: ex.id }, data: { status: "ACTIVE" } });
  else await prisma.designation.create({ data: { id: uuid(), name: p.data.name, departmentId: d.id } });
  await audit(req.user.id, "DESIGNATION_CREATED", "department", d.id, req.ip);
  res.status(201).json(ok({ created: true }));
}));

router.delete("/designations/:id", wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return bad(res);
  const g = await prisma.designation.findUnique({ where: { id: req.params.id } }); if (!g) return nf(res);
  await prisma.designation.update({ where: { id: g.id }, data: { status: "INACTIVE" } });
  await audit(req.user.id, "DESIGNATION_REMOVED", "designation", g.id, req.ip);
  res.json(ok({ removed: true }));
}));

// ---- Custom employee form fields ----
const field = z.object({
  label: z.string().trim().min(2).max(60),
  fieldType: z.enum(["TEXT", "NUMBER", "DATE", "DROPDOWN"]),
  section: z.enum(["PERSONAL", "EMPLOYMENT", "BANK", "ADDITIONAL"]).default("PERSONAL"), // which existing step of the form it appears in
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
}).superRefine((f, ctx) => {
  if (f.fieldType === "DROPDOWN" && (f.options?.length ?? 0) < 2) ctx.addIssue({ code: "custom", path: ["options"], message: "Add at least 2 options" });
});

router.get("/custom-fields", wrap(async (_req, res) => {
  const items = await prisma.customField.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  res.json(ok({ items: items.map((d) => ({ id: d.id, label: d.label, fieldType: d.fieldType, section: d.section, required: d.required, options: d.options ?? [], status: d.status })) }));
}));

router.post("/custom-fields", wrap(async (req, res) => {
  const p = field.safeParse(req.body); if (!p.success) return zodFail(res, p.error);
  const last = await prisma.customField.aggregate({ _max: { sortOrder: true } });
  const f = await prisma.customField.create({ data: {
    id: uuid(), fieldKey: `cf_${uuid().replace(/-/g, "").slice(0, 10)}`, label: p.data.label, fieldType: p.data.fieldType, section: p.data.section, required: p.data.required,
    options: p.data.fieldType === "DROPDOWN" ? [...new Set(p.data.options)] : undefined, sortOrder: (last._max.sortOrder ?? 0) + 1,
  } });
  await audit(req.user.id, "CUSTOM_FIELD_CREATED", "custom_field", f.id, req.ip);
  res.status(201).json(ok({ id: f.id }));
}));

// Type cannot change after creation (existing values would no longer match).
router.put("/custom-fields/:id", wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return bad(res);
  const cur = await prisma.customField.findUnique({ where: { id: req.params.id } }); if (!cur) return nf(res);
  const p = field.safeParse({ ...req.body, fieldType: cur.fieldType }); if (!p.success) return zodFail(res, p.error);
  await prisma.customField.update({ where: { id: cur.id }, data: { label: p.data.label, section: p.data.section, required: p.data.required, options: cur.fieldType === "DROPDOWN" ? [...new Set(p.data.options)] : undefined } });
  await audit(req.user.id, "CUSTOM_FIELD_UPDATED", "custom_field", cur.id, req.ip);
  res.json(ok({ updated: true }));
}));

// Move a field up/down inside its section (swaps order with its neighbour).
router.post("/custom-fields/:id/move", wrap(async (req, res) => {
  const b = z.object({ direction: z.enum(["up", "down"]) }).safeParse(req.body);
  if (!uid.safeParse(req.params.id).success || !b.success) return bad(res);
  const all = await prisma.customField.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const cur = all.find((x) => x.id === req.params.id); if (!cur) return nf(res);
  const same = all.filter((x) => x.section === cur.section);
  const i = same.findIndex((x) => x.id === cur.id), j = b.data.direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= same.length) return res.json(ok({ moved: false }));
  const other = same[j];
  await prisma.$transaction([
    prisma.customField.update({ where: { id: cur.id }, data: { sortOrder: other.sortOrder } }),
    prisma.customField.update({ where: { id: other.id }, data: { sortOrder: cur.sortOrder } }),
  ]);
  res.json(ok({ moved: true }));
}));

// "Remove" hides the field from the form; values already saved on employees are kept.
router.delete("/custom-fields/:id", wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return bad(res);
  const cur = await prisma.customField.findUnique({ where: { id: req.params.id } }); if (!cur) return nf(res);
  await prisma.customField.update({ where: { id: cur.id }, data: { status: "INACTIVE" } });
  await audit(req.user.id, "CUSTOM_FIELD_REMOVED", "custom_field", cur.id, req.ip);
  res.json(ok({ removed: true }));
}));
router.post("/custom-fields/:id/restore", wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return bad(res);
  const cur = await prisma.customField.findUnique({ where: { id: req.params.id } }); if (!cur) return nf(res);
  await prisma.customField.update({ where: { id: cur.id }, data: { status: "ACTIVE" } });
  res.json(ok({ restored: true }));
}));

export default router;
