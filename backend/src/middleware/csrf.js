import { env } from "../config/env.js";
import { fail } from "../utils/helpers.js";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);
const NO_TOKEN = new Set(["/api/v1/auth/login", "/api/v1/auth/mfa/verify", "/api/v1/auth/forgot-password", "/api/v1/auth/reset-password", "/api/v1/support/concern"]); // pre-session; Origin check still applies

// Strict Origin check + double-submit token for cookie-authenticated state changes.
export function csrf(req, res, next) {
  if (SAFE.has(req.method)) return next();
  if (!env.ORIGINS.includes(req.get("origin"))) return res.status(403).json(fail("Invalid origin"));
  if (NO_TOKEN.has(req.originalUrl.split("?")[0])) return next();
  const cookie = req.cookies?.hrms_csrf;
  if (!cookie || cookie !== req.get("x-csrf-token")) return res.status(403).json(fail("Invalid CSRF token"));
  next();
}
