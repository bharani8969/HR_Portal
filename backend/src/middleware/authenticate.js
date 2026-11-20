import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { sha256, fail, wrap } from "../utils/helpers.js";

export const authenticate = wrap(async (req, res, next) => {
  const raw = req.cookies?.[env.SESSION_COOKIE_NAME];
  if (!raw) return res.status(401).json(fail("Not authenticated"));
  const s = await prisma.session.findUnique({ where: { sessionTokenHash: sha256(raw) }, include: { user: true } });
  const now = new Date();
  const idleMs = env.SESSION_IDLE_TIMEOUT_MINUTES * 60000;
  if (!s || s.revokedAt || s.expiresAt < now || now - s.lastActivityAt > idleMs || s.user.status !== "ACTIVE")
    return res.status(401).json(fail("Not authenticated"));
  // Admin must finish MFA setup before using anything except /auth/*.
  if (env.REQUIRE_ADMIN_MFA && s.user.role === "ADMIN" && !s.user.mfaEnabled && !req.originalUrl.startsWith("/api/v1/auth"))
    return res.status(403).json({ success: false, error: { message: "MFA setup required", code: "MFA_SETUP_REQUIRED" } });
  await prisma.session.update({ where: { id: s.id }, data: { lastActivityAt: now } });
  req.sessionId = s.id;
  req.user = { id: s.user.id, role: s.user.role, name: s.user.name, email: s.user.email, mfaEnabled: s.user.mfaEnabled };
  next();
});
