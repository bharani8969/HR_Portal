// Sets (or creates) the Admin account from ADMIN_EMAIL / ADMIN_PASSWORD in .env.
// Use when the Admin password is forgotten or .env was changed after the first seed.  Run: npm run reset-admin
import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
if (!email || password.length < 12) { console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env"); process.exit(1); }

const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
const user = await prisma.user.findUnique({ where: { email } });
if (user) {
  if (user.role !== "ADMIN") { console.error(`${email} exists but is not an Admin. Use a different ADMIN_EMAIL.`); process.exit(1); }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, status: "ACTIVE", deactivatedAt: null, deletedAt: null } });
  await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  console.log("Admin password updated for", email);
} else {
  await prisma.user.create({ data: { id: randomUUID(), name: "CEO / Admin", email, role: "ADMIN", passwordHash } });
  console.log("Admin created:", email);
}
await prisma.$disconnect();
