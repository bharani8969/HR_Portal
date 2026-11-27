import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { audit } from "../auth/audit.js";
import { sendEmail } from "../../services/emailService.js";
import { isReady } from "../../services/emailProviders.js";
import { renderEmail } from "../../services/emailTemplates.js";
import { getConcernRecipients, setSetting } from "../../services/settings.js";
import { parseRecipients } from "../../utils/recipients.js";
import { ok, fail, wrap, zodFail, fieldsFail } from "../../utils/helpers.js";

// Admin: where emails go, whether the provider is connected, a test button, and a delivery log.
const router = Router();
router.use(authenticate, authorize("ADMIN"));
const testLimiter = rateLimit({ windowMs: 10 * 60000, limit: 5, standardHeaders: true, legacyHeaders: false, message: fail("Too many test emails. Try again in a few minutes.") });

router.get("/email/settings", wrap(async (_req, res) => {
  const notes = [];
  if (env.EMAIL_DRIVER === "console") notes.push("Email is in console mode: messages are only printed in the server log. Set EMAIL_DRIVER=resend and RESEND_API_KEY to send real email.");
  if (env.EMAIL_DRIVER === "resend" && /@resend\.dev/i.test(env.EMAIL_FROM)) notes.push("You are using Resend's test sender (onboarding@resend.dev). It only delivers to the email address your Resend account was created with. Verify your own domain in Resend and change EMAIL_FROM to email everyone.");
  res.json(ok({ provider: env.EMAIL_DRIVER, from: env.EMAIL_FROM, ready: isReady(), notes, recipients: await getConcernRecipients(), defaultRecipient: env.CONCERN_TO_EMAIL }));
}));

router.put("/email/settings", wrap(async (req, res) => {
  const r = parseRecipients(req.body?.recipients);
  if (!r.ok) return fieldsFail(res, { recipients: r.error });
  await setSetting("concern_recipients", r.value, req.user.id);
  await audit(req.user.id, "EMAIL_DESTINATIONS_UPDATED", "settings", null, req.ip, { count: r.value.length });
  res.json(ok({ recipients: r.value }));
}));

router.post("/email/test", testLimiter, wrap(async (req, res) => {
  const p = z.object({ to: z.string().email().max(254) }).safeParse(req.body);
  if (!p.success) return zodFail(res, p.error);
  try {
    const sent = await sendEmail({
      to: p.data.to.toLowerCase(), type: "TEST", subject: `Test email from ${env.APP_NAME}`,
      ...renderEmail({ title: "Email is working", lines: [`This is a test message from ${env.APP_NAME} for ${env.CLIENT_NAME}.`, "If you can read it, password resets, invitations and concerns can be delivered."] }),
    });
    res.json(ok({ sent, console: !sent }));
  } catch (e) { res.json(ok({ sent: false, error: e.message })); }
}));

router.get("/email/logs", wrap(async (req, res) => {
  const q = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(15) }).safeParse(req.query);
  if (!q.success) return res.status(400).json(fail("Invalid request"));
  const { page, pageSize } = q.data;
  const [items, total] = await Promise.all([
    prisma.emailLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.emailLog.count(),
  ]);
  res.json(ok({ total, page, pageSize, items: items.map((l) => ({ id: l.id, type: l.type, to: l.toAddress, subject: l.subject, status: l.status, provider: l.provider, error: l.error, createdAt: l.createdAt })) }));
}));

export default router;
