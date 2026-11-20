import { Router } from "express";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { fullyDocumented } from "../documents/completion.js";
import { REQUIRED } from "../../utils/files.js";
import { ok, wrap } from "../../utils/helpers.js";

const router = Router();
router.use(authenticate);
// Admin = company aggregates (counts only). HR = always scoped to own assigned employees by session id.
const scope = (req) => (req.user.role === "HR" ? { assignedHrUserId: req.user.id } : {});

router.get("/hr-wise-employees", authorize("ADMIN"), wrap(async (_req, res) => {
  const [g, hrs] = await Promise.all([
    prisma.employee.groupBy({ by: ["assignedHrUserId", "registrationStatus"], where: { archivedAt: null }, _count: { _all: true } }),
    prisma.user.findMany({ where: { role: "HR", deletedAt: null }, select: { id: true, name: true, status: true } }),
  ]);
  const n = (id, st) => g.find((x) => x.assignedHrUserId === id && x.registrationStatus === st)?._count._all ?? 0;
  res.json(ok({ items: hrs.map((h) => ({ ...h, complete: n(h.id, "COMPLETE"), draft: n(h.id, "DRAFT") })) }));
}));

router.get("/employee-count", wrap(async (req, res) => {
  const where = { ...scope(req), archivedAt: null };
  const [reg, emp] = await Promise.all([
    prisma.employee.groupBy({ by: ["registrationStatus"], where, _count: { _all: true } }),
    prisma.employee.groupBy({ by: ["employmentStatus"], where: { ...where, registrationStatus: "COMPLETE" }, _count: { _all: true } }),
  ]);
  const o = (arr, k) => Object.fromEntries(arr.map((x) => [x[k], x._count._all]));
  res.json(ok({ registration: o(reg, "registrationStatus"), employment: o(emp, "employmentStatus") }));
}));

router.get("/document-status", wrap(async (req, res) => {
  const where = { ...scope(req), archivedAt: null, registrationStatus: "COMPLETE" };
  const [total, full, cats] = await Promise.all([
    prisma.employee.count({ where }), fullyDocumented(where),
    prisma.employeeDocument.groupBy({ by: ["documentType"], where: { status: "ACTIVE", employee: where }, _count: { _all: true } }),
  ]);
  res.json(ok({ employees: total, fullyDocumented: full.size, requiredCategories: REQUIRED.length, byCategory: cats.map((c) => ({ category: c.documentType, uploaded: c._count._all })) }));
}));

export default router;
