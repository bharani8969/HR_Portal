import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { sendEmail } from "../../services/emailService.js";
import { uuid, ok, fail, wrap, zodFail } from "../../utils/helpers.js";

// Public "Powered by <vendor>" contact form. The recipient is fixed on the server (CONCERN_TO_EMAIL):
// the browser can never choose where mail goes, so this cannot be used as a mail relay.
const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60000, limit: 5, standardHeaders: true, legacyHeaders: false, message: fail("Too many messages. Please try again in a few minutes.") });
const CATS = ["Bug or issue", "Feature request", "Account or access", "Billing or licence", "Other"];
const body = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().max(254),
  category: z.enum(CATS),
  message: z.string().trim().min(10).max(2000),
});
const oneLine = (s) => s.replace(/[\r\n]+/g, " ");

router.get("/info", (_req, res) => res.json(ok({ to: env.CONCERN_TO_EMAIL, categories: CATS })));

router.post("/concern", limiter, wrap(async (req, res) => {
  const p = body.safeParse(req.body); if (!p.success) return zodFail(res, p.error);
  const row = await prisma.supportRequest.create({ data: { id: uuid(), ...p.data, ip: req.ip } }); // saved first, so nothing is lost if email fails
  let emailed = false, status = "SAVED";
  try {
    emailed = await sendEmail({
      to: env.CONCERN_TO_EMAIL, replyTo: p.data.email,
      subject: `[${env.APP_NAME} · ${env.CLIENT_NAME}] ${p.data.category} from ${oneLine(p.data.name)}`,
      text: `New concern from ${env.APP_NAME} (${env.CLIENT_NAME})\n\nName: ${oneLine(p.data.name)}\nEmail: ${p.data.email}\nCategory: ${p.data.category}\nReceived: ${new Date().toISOString()}\n\nMessage:\n${p.data.message}\n`,
    });
    if (emailed) status = "EMAILED";
  } catch (e) { status = "EMAIL_FAILED"; console.error("Concern email failed:", e.message); }
  await prisma.supportRequest.update({ where: { id: row.id }, data: { status } });
  res.status(201).json(ok({ saved: true, emailed }));
}));

export default router;
