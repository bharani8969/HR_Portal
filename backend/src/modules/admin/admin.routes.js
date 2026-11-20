import { Router } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { audit } from "../auth/audit.js";
import { randomToken, uuid, ok, fail, wrap, zodFail } from "../../utils/helpers.js";
import { env } from "../../config/env.js";
import { issueResetToken } from "../auth/tokens.js";
import { sendEmail } from "../../services/emailService.js";

const router = Router();
router.use(authenticate, authorize("ADMIN"));

const id = z.string().uuid();
const page = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(10), q: z.string().max(100).optional() });
const hrBody = z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().max(254), phone: z.string().max(20).optional() });
const select = { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true, createdAt: true };
const bad = (res) => res.status(400).json(fail("Invalid request"));
const hrOnly = (userId) => prisma.user.findFirst({ where: { id: userId, role: "HR", deletedAt: null }, select });

router.get("/hr-users", wrap(async (req, res) => {
  const p = page.safeParse(req.query); if (!p.success) return bad(res);
  const { page: pg, pageSize, q } = p.data;
  const where = { role: "HR", deletedAt: null, ...(q && { OR: [{ name: { contains: q } }, { email: { contains: q } }] }) };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select, orderBy: { createdAt: "desc" }, skip: (pg - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ]);
  const counts = await prisma.employee.groupBy({ by: ["assignedHrUserId"], where: { archivedAt: null, registrationStatus: "COMPLETE", assignedHrUserId: { in: items.map((i) => i.id) } }, _count: { _all: true } });
  const map = new Map(counts.map((c) => [c.assignedHrUserId, c._count._all]));
  res.json(ok({ items: items.map((i) => ({ ...i, employees: map.get(i.id) ?? 0 })), total, page: pg, pageSize }));
}));

// Invitation flow: the HR user gets a single-use link (72h) to set their own password. No password is ever shared.
router.post("/hr-users", wrap(async (req, res) => {
  const p = hrBody.safeParse(req.body); if (!p.success) return zodFail(res, p.error);
  const email = p.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json(fail("Email already in use", { email: "This email is already in use" }));
  const user = await prisma.user.create({
    data: { id: uuid(), name: p.data.name, email, phone: p.data.phone, role: "HR", passwordHash: await argon2.hash(randomToken(), { type: argon2.argon2id }) },
    select,
  });
  const link = await issueResetToken(user.id, 72 * 60);
  await sendEmail({ to: email, subject: `You're invited to ${env.APP_NAME} (${env.CLIENT_NAME})`, text: `Hello ${user.name},\n\nSet your password using this single-use link (valid 72 hours):\n${link}\n\nPowered by ${env.POWERED_BY}` });
  await audit(req.user.id, "HR_CREATED", "user", user.id, req.ip);
  res.status(201).json(ok({ user, ...(env.EMAIL_DRIVER === "console" && { inviteLink: link }) })); // link echoed in dev only
}));

router.get("/hr-users/:id", wrap(async (req, res) => {
  if (!id.safeParse(req.params.id).success) return bad(res);
  const hr = await hrOnly(req.params.id); if (!hr) return res.status(404).json(fail("Not found"));
  const employees = await prisma.employee.count({ where: { assignedHrUserId: hr.id, archivedAt: null, registrationStatus: "COMPLETE" } });
  res.json(ok({ ...hr, employees }));
}));

router.put("/hr-users/:id", wrap(async (req, res) => {
  const body = hrBody.pick({ name: true, phone: true }).safeParse(req.body);
  if (!id.safeParse(req.params.id).success) return bad(res);
  if (!body.success) return zodFail(res, body.error);
  if (!(await hrOnly(req.params.id))) return res.status(404).json(fail("Not found"));
  const user = await prisma.user.update({ where: { id: req.params.id }, data: body.data, select });
  await audit(req.user.id, "HR_UPDATED", "user", user.id, req.ip);
  res.json(ok({ user }));
}));

router.patch("/hr-users/:id/status", wrap(async (req, res) => {
  const body = z.object({ status: z.enum(["ACTIVE", "INACTIVE"]) }).safeParse(req.body);
  if (!id.safeParse(req.params.id).success || !body.success) return bad(res);
  if (!(await hrOnly(req.params.id))) return res.status(404).json(fail("Not found"));
  const off = body.data.status === "INACTIVE";
  const [user] = await prisma.$transaction([
    prisma.user.update({ where: { id: req.params.id }, data: { status: body.data.status, deactivatedAt: off ? new Date() : null }, select }),
    ...(off ? [prisma.session.updateMany({ where: { userId: req.params.id, revokedAt: null }, data: { revokedAt: new Date() } })] : []), // revoke sessions
  ]);
  await audit(req.user.id, off ? "HR_DEACTIVATED" : "HR_ACTIVATED", "user", user.id, req.ip);
  res.json(ok({ user }));
}));

// Delete = soft delete (history and audit trail stay intact). Blocked while the HR still has employees.
router.delete("/hr-users/:id", wrap(async (req, res) => {
  if (!id.safeParse(req.params.id).success) return bad(res);
  const hr = await hrOnly(req.params.id); if (!hr) return res.status(404).json(fail("Not found"));
  const n = await prisma.employee.count({ where: { assignedHrUserId: hr.id, archivedAt: null } });
  if (n > 0) return res.status(409).json(fail(`This HR still has ${n} employee${n > 1 ? "s" : ""}. Transfer them to another HR (or delete them) first.`));
  await prisma.$transaction([
    prisma.user.update({ where: { id: hr.id }, data: { status: "INACTIVE", deactivatedAt: new Date(), deletedAt: new Date(), email: `deleted-${hr.id}@deleted.invalid` } }),
    prisma.session.updateMany({ where: { userId: hr.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await audit(req.user.id, "HR_DELETED", "user", hr.id, req.ip);
  res.json(ok({ deleted: true }));
}));

// Operational summary only: no sensitive data or documents.
router.get("/hr-users/:id/employees", wrap(async (req, res) => {
  const p = page.safeParse(req.query);
  if (!id.safeParse(req.params.id).success || !p.success) return bad(res);
  if (!(await hrOnly(req.params.id))) return res.status(404).json(fail("Not found"));
  const where = { assignedHrUserId: req.params.id, archivedAt: null };
  const [items, total] = await Promise.all([
    prisma.employee.findMany({ where, select: { id: true, employeeCode: true, firstName: true, lastName: true, registrationStatus: true, employmentStatus: true }, orderBy: { createdAt: "desc" }, skip: (p.data.page - 1) * p.data.pageSize, take: p.data.pageSize }),
    prisma.employee.count({ where }),
  ]);
  res.json(ok({ items, total, page: p.data.page, pageSize: p.data.pageSize }));
}));

router.get("/audit-logs", wrap(async (req, res) => {
  const p = page.extend({ action: z.string().max(50).optional(), entityType: z.string().max(50).optional() }).safeParse(req.query);
  if (!p.success) return bad(res);
  const { page: pg, pageSize, action, entityType } = p.data;
  const where = { ...(action && { action }), ...(entityType && { entityType }) };
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (pg - 1) * pageSize, take: pageSize, include: { actor: { select: { name: true } } } }),
    prisma.auditLog.count({ where }),
  ]);
  res.json(ok({ items: rows.map((r) => ({ id: r.id, action: r.action, entityType: r.entityType, entityId: r.entityId, actor: r.actor?.name ?? "System", ip: r.ip, createdAt: r.createdAt })), total, page: pg, pageSize }));
}));

export default router;
