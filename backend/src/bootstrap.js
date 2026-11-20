import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { prisma } from "./config/database.js";

// Hosts without a shell (free tiers) cannot run `npm run seed`. If no Admin exists yet and
// ADMIN_EMAIL + ADMIN_PASSWORD are set, create the first Admin once. After that, delete ADMIN_PASSWORD from the environment.
export async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 12) return;
  if ((await prisma.user.count({ where: { role: "ADMIN", deletedAt: null } })) > 0) return;
  await prisma.user.create({ data: { id: randomUUID(), name: "CEO / Admin", email, role: "ADMIN", passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  console.log(`Bootstrap: first Admin created (${email}). Remove ADMIN_PASSWORD from the environment after you sign in.`);
}
