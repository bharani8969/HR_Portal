import { Router } from "express";
import crypto from "node:crypto";
import argon2 from "argon2";
import qrcode from "qrcode";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/authenticate.js";
import { encrypt, decrypt } from "../../services/encryptionService.js";
import { sendEmail } from "../../services/emailService.js";
import { renderEmail } from "../../services/emailTemplates.js";
import { newSecret, verifyTotp } from "../../utils/totp.js";
import { sha256, randomToken, uuid, ok, fail, wrap, zodFail } from "../../utils/helpers.js";
import { issueResetToken } from "./tokens.js";
import { audit } from "./audit.js";

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: true, legacyHeaders: false, message: fail("Too many attempts. Try again later.") });
const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });
const pwSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12).max(200) });
const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/) });
const hash = (p) => argon2.hash(p, { type: argon2.argon2id });
const DUMMY_HASH = await hash("dummy-password-for-timing");

const cookieBase = { secure: env.COOKIE_SECURE, sameSite: "strict", path: "/" };
async function startSession(res, userId) {
  const token = randomToken();
  const now = new Date();
  await prisma.session.create({ data: { id: uuid(), userId, sessionTokenHash: sha256(token), lastActivityAt: now, expiresAt: new Date(now.getTime() + env.SESSION_TTL_MINUTES * 60000) } });
  res.cookie(env.SESSION_COOKIE_NAME, token, { ...cookieBase, httpOnly: true, maxAge: env.SESSION_TTL_MINUTES * 60000 });
  res.cookie("hrms_csrf", randomToken(), { ...cookieBase, httpOnly: false });
}
export const safeUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, mfaEnabled: u.mfaEnabled,
  mfaSetupRequired: env.REQUIRE_ADMIN_MFA && u.role === "ADMIN" && !u.mfaEnabled,
});

// Signed, short-lived "password OK, MFA pending" cookie (no session exists until the code is verified).
const mac = (payload) => crypto.createHmac("sha256", Buffer.from(env.DATA_ENCRYPTION_KEY, "base64")).update(`mfa-pending|${payload}`).digest("base64url");
const signPending = (userId) => { const p = `${userId}.${Date.now() + 5 * 60000}`; return `${p}.${mac(p)}`; };
function readPending(raw = "") {
  const [userId, exp, sig] = raw.split(".");
  if (!sig || sig.length !== mac(`${userId}.${exp}`).length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(mac(`${userId}.${exp}`)))) return null;
  return Number(exp) > Date.now() ? userId : null;
}

async function finishLogin(req, res, user) {
  await startSession(res, user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(user.id, "LOGIN_SUCCESS", "user", user.id, req.ip);
  res.json(ok({ user: safeUser(user) }));
}

router.post("/login", limiter, wrap(async (req, res) => {
  const p = loginSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json(fail("Invalid email or password"));
  const user = await prisma.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
  const valid = await argon2.verify(user?.passwordHash ?? DUMMY_HASH, p.data.password).catch(() => false);
  if (!user || !valid || user.status !== "ACTIVE") {
    await audit(user?.id ?? null, "LOGIN_FAILED", "user", user?.id ?? null, req.ip);
    return res.status(401).json(fail("Invalid email or password")); // generic on purpose
  }
  if (user.mfaEnabled) {
    res.cookie("hrms_mfa", signPending(user.id), { ...cookieBase, httpOnly: true, maxAge: 5 * 60000 });
    return res.json(ok({ mfaRequired: true }));
  }
  await finishLogin(req, res, user);
}));

router.post("/mfa/verify", limiter, wrap(async (req, res) => {
  const p = codeSchema.safeParse(req.body);
  const userId = readPending(req.cookies?.hrms_mfa);
  if (!p.success || !userId) return res.status(401).json(fail("Invalid or expired code"));
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== "ACTIVE" || !user.mfaEnabled || !user.mfaSecretEnc || !verifyTotp(decrypt(user.mfaSecretEnc), p.data.code)) {
    await audit(userId, "MFA_FAILED", "user", userId, req.ip);
    return res.status(401).json(fail("Invalid or expired code"));
  }
  res.clearCookie("hrms_mfa", cookieBase);
  await finishLogin(req, res, user);
}));

router.post("/mfa/setup", authenticate, wrap(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user.mfaEnabled) return res.status(409).json(fail("MFA is already enabled"));
  const secret = newSecret();
  await prisma.user.update({ where: { id: user.id }, data: { mfaSecretEnc: encrypt(secret) } });
  const otpauth = `otpauth://totp/${encodeURIComponent(env.APP_NAME)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(`${env.APP_NAME} (${env.CLIENT_NAME})`)}`;
  res.json(ok({ secret, qr: await qrcode.toDataURL(otpauth) }));
}));

router.post("/mfa/enable", authenticate, limiter, wrap(async (req, res) => {
  const p = codeSchema.safeParse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!p.success || !user.mfaSecretEnc || !verifyTotp(decrypt(user.mfaSecretEnc), p.data.code)) return res.status(422).json(fail("That code is not valid", { code: "That code is not valid" }));
  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
  await audit(user.id, "MFA_ENABLED", "user", user.id, req.ip);
  res.json(ok({ enabled: true }));
}));

router.post("/logout", authenticate, wrap(async (req, res) => {
  await prisma.session.update({ where: { id: req.sessionId }, data: { revokedAt: new Date() } });
  res.clearCookie(env.SESSION_COOKIE_NAME, cookieBase).clearCookie("hrms_csrf", cookieBase);
  await audit(req.user.id, "LOGOUT", "user", req.user.id, req.ip);
  res.json(ok({ loggedOut: true }));
}));

router.get("/me", authenticate, wrap(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json(ok({ user: safeUser(user) }));
}));

router.post("/change-password", authenticate, limiter, wrap(async (req, res) => {
  const p = pwSchema.safeParse(req.body);
  if (!p.success) return zodFail(res, p.error);
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!(await argon2.verify(user.passwordHash, p.data.currentPassword).catch(() => false))) return res.status(401).json(fail("Current password is incorrect", { currentPassword: "Current password is incorrect" }));
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(p.data.newPassword) } });
  await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  await startSession(res, user.id); // rotate
  await audit(user.id, "PASSWORD_CHANGED", "user", user.id, req.ip);
  res.json(ok({ changed: true }));
}));

// Always the same response, so accounts cannot be enumerated.
router.post("/forgot-password", limiter, wrap(async (req, res) => {
  const p = z.object({ email: z.string().email().max(254) }).safeParse(req.body);
  if (!p.success) return zodFail(res, p.error);
  {
    const user = await prisma.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
    if (user?.status === "ACTIVE") {
      const link = await issueResetToken(user.id, 30);
      try { // a delivery problem must never change the generic answer or reveal that the account exists
        await sendEmail({
          to: user.email, type: "RESET", subject: `Reset your ${env.APP_NAME} password`,
          ...renderEmail({ title: "Reset your password", lines: [`We received a request to reset your ${env.APP_NAME} password.`, "The link works once and expires in 30 minutes. If you did not ask for this, you can ignore this email."], button: { label: "Choose a new password", url: link } }),
        });
      } catch (e) { console.error("Reset email failed:", e.message); }
      await audit(user.id, "PASSWORD_RESET_REQUESTED", "user", user.id, req.ip);
    }
  }
  res.json(ok({ message: "If that account exists, an email has been sent." }));
}));

router.post("/reset-password", limiter, wrap(async (req, res) => {
  const p = z.object({ token: z.string().min(20).max(200), newPassword: z.string().min(12).max(200) }).safeParse(req.body);
  if (!p.success) return zodFail(res, p.error);
  const t = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(p.data.token) } });
  if (!t || t.usedAt || t.expiresAt < new Date()) return res.status(400).json(fail("Invalid or expired link"));
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: t.userId }, data: { passwordHash: await hash(p.data.newPassword) } }),
    prisma.session.updateMany({ where: { userId: t.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await audit(t.userId, "PASSWORD_RESET_DONE", "user", t.userId, req.ip);
  res.json(ok({ reset: true }));
}));

export default router;
