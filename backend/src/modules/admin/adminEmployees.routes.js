import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { uuid, ok, fail, wrap } from "../../utils/helpers.js";

const router = Router();
router.use(authenticate, authorize("ADMIN"));
const uid = z.string().uuid();
const pg = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(10), q: z.string().max(100).optional() });

// Operational overview only: never sensitive fields or documents.
router.get("/employees", wrap(async (req, res) => {
  const p = pg.safeParse(req.query); if (!p.success) return res.status(400).json(fail("Invalid request"));
  const { page, pageSize, q } = p.data;
  const where = { archivedAt: null, ...(q && { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { employeeCode: { contains: q } }] }) };
  const [rows, total] = await Promise.all([
    prisma.employee.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, employeeCode: true, firstName: true, lastName: true, registrationStatus: true, employmentStatus: true, assignedHrUserId: true, department: { select: { name: true } }, designation: { select: { name: true } } } }),
    prisma.employee.count({ where }),
  ]);
  const hrs = await prisma.user.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.assignedHrUserId))] } }, select: { id: true, name: true } });
  const name = new Map(hrs.map((h) => [h.id, h.name]));
  res.json(ok({ total, page, pageSize, items: rows.map(({ department, designation, ...r }) => ({ ...r, department: department?.name ?? null, designation: designation?.name ?? null, assignedHr: name.get(r.assignedHrUserId) })) }));
}));

// Transfer = one DB transaction: reassign + history row + audit event. createdByUserId is never touched.
router.post("/employees/:id/transfer", wrap(async (req, res) => {
  const b = z.object({ newHrId: uid, reason: z.string().trim().max(300).optional() }).safeParse(req.body);
  if (!uid.safeParse(req.params.id).success || !b.success) return res.status(400).json(fail("Invalid request"));
  const r = await prisma.$transaction(async (tx) => {
    const e = await tx.employee.findFirst({ where: { id: req.params.id, archivedAt: null } });
    if (!e) return { s: 404, m: "Not found" };
    if (e.assignedHrUserId === b.data.newHrId) return { s: 409, m: "Already assigned to this HR" };
    const hr = await tx.user.findFirst({ where: { id: b.data.newHrId, role: "HR", status: "ACTIVE" } });
    if (!hr) return { s: 422, m: "Target must be an active HR user" };
    await tx.employee.update({ where: { id: e.id }, data: { assignedHrUserId: hr.id } });
    await tx.employeeHrTransfer.create({ data: { id: uuid(), employeeId: e.id, previousHrId: e.assignedHrUserId, newHrId: hr.id, transferredByUserId: req.user.id, reason: b.data.reason } });
    await tx.auditLog.create({ data: { id: uuid(), actorUserId: req.user.id, action: "EMPLOYEE_TRANSFERRED", entityType: "employee", entityId: e.id, ip: req.ip, metadata: { from: e.assignedHrUserId, to: hr.id } } });
    return { s: 200 };
  });
  res.status(r.s).json(r.s === 200 ? ok({ transferred: true }) : fail(r.m));
}));

// Soft delete: disappears from every list and count; rows are kept for audit.
router.delete("/employees/:id", wrap(async (req, res) => {
  if (!uid.safeParse(req.params.id).success) return res.status(400).json(fail("Invalid request"));
  const e = await prisma.employee.findFirst({ where: { id: req.params.id, archivedAt: null } });
  if (!e) return res.status(404).json(fail("Not found"));
  await prisma.employee.update({ where: { id: e.id }, data: { archivedAt: new Date() } });
  await prisma.auditLog.create({ data: { id: uuid(), actorUserId: req.user.id, action: "EMPLOYEE_DELETED_BY_ADMIN", entityType: "employee", entityId: e.id, ip: req.ip } });
  res.json(ok({ deleted: true }));
}));

router.get("/transfers", wrap(async (req, res) => {
  const p = pg.safeParse(req.query); if (!p.success) return res.status(400).json(fail("Invalid request"));
  const [rows, total] = await Promise.all([
    prisma.employeeHrTransfer.findMany({ orderBy: { transferredAt: "desc" }, skip: (p.data.page - 1) * p.data.pageSize, take: p.data.pageSize, include: { employee: { select: { employeeCode: true, firstName: true, lastName: true } } } }),
    prisma.employeeHrTransfer.count(),
  ]);
  const users = await prisma.user.findMany({ where: { id: { in: rows.flatMap((r) => [r.previousHrId, r.newHrId, r.transferredByUserId]) } }, select: { id: true, name: true } });
  const n = new Map(users.map((u) => [u.id, u.name]));
  res.json(ok({ total, items: rows.map((r) => ({ id: r.id, employee: `${r.employee.employeeCode} · ${r.employee.firstName} ${r.employee.lastName}`, from: n.get(r.previousHrId), to: n.get(r.newHrId), by: n.get(r.transferredByUserId), reason: r.reason, at: r.transferredAt })) }));
}));

export default router;
