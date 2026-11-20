import { Router } from "express";
import { prisma } from "../../config/database.js";
import { authenticate } from "../../middleware/authenticate.js";
import { ok, wrap } from "../../utils/helpers.js";

const router = Router();
router.get("/", authenticate, wrap(async (_req, res) => {
  const items = await prisma.department.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, designations: { where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } } } });
  res.json(ok({ items }));
}));
export default router;
