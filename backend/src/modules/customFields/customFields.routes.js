import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { activeDefs } from "./defs.js";
import { ok, wrap } from "../../utils/helpers.js";

const router = Router();
// Any signed-in user can read the ACTIVE field definitions (the employee form renders from them).
router.get("/", authenticate, wrap(async (_req, res) => {
  const items = await activeDefs();
  res.json(ok({ items: items.map((d) => ({ id: d.id, label: d.label, fieldKey: d.fieldKey, fieldType: d.fieldType, section: d.section, options: d.options ?? [], required: d.required })) }));
}));
export default router;
