import { Router } from "express";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { fullyDocumented } from "../documents/completion.js";
import { ok, wrap } from "../../utils/helpers.js";

const router = Router();
router.use(authenticate);
const live = { archivedAt: null };

router.get("/admin", authorize("ADMIN"), wrap(async (_req, res) => {
  const where = { ...live, registrationStatus: "COMPLETE" };
  const [total, groups, hrs] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.groupBy({ by: ["assignedHrUserId"], where, _count: { _all: true } }),
    prisma.user.findMany({ where: { role: "HR", deletedAt: null }, select: { id: true, name: true, status: true } }),
  ]);
  const counts = new Map(groups.map((g) => [g.assignedHrUserId, g._count._all]));
  res.json(ok({
    totalEmployees: total,
    activeHr: hrs.filter((h) => h.status === "ACTIVE").length,
    inactiveHr: hrs.filter((h) => h.status !== "ACTIVE").length,
    hrWise: hrs.map((h) => ({ ...h, employees: counts.get(h.id) ?? 0 })),
  }));
}));

// Scoped by the session user id inside the query itself (never a client-supplied id).
router.get("/hr", authorize("HR"), wrap(async (req, res) => {
  const mine = { ...live, assignedHrUserId: req.user.id };
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [total, thisMonth, drafts] = await Promise.all([
    prisma.employee.count({ where: { ...mine, registrationStatus: "COMPLETE" } }),
    prisma.employee.count({ where: { ...mine, registrationStatus: "COMPLETE", createdAt: { gte: monthStart } } }),
    prisma.employee.count({ where: { ...mine, registrationStatus: "DRAFT" } }),
  ]);
  const full = await fullyDocumented({ ...mine, registrationStatus: "COMPLETE" });
  res.json(ok({ total, thisMonth, drafts, pendingDocuments: Math.max(0, total - full.size) }));
}));

export default router;
