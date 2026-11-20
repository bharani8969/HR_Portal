// Creates the first CEO/Admin from env vars. Synthetic data only.
import "dotenv/config";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
if (!email || password.length < 12) { console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ chars) in .env"); process.exit(1); }

const exists = await prisma.user.findUnique({ where: { email } });
if (exists) console.log("Admin already exists");
else {
  await prisma.user.create({ data: { id: randomUUID(), name: "CEO / Admin", email, role: "ADMIN", passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
  console.log("Admin created:", email);
}

// Counter row (so employee codes are concurrency-safe) and sample departments/designations.
await prisma.counter.upsert({ where: { key: "employee_code" }, update: {}, create: { key: "employee_code", value: 0 } });
const depts = { Engineering: ["Software Engineer", "QA Engineer", "Team Lead"], "Human Resources": ["HR Executive", "HR Manager"], Finance: ["Accountant", "Finance Manager"], Operations: ["Operations Executive", "Operations Manager"] };
for (const [name, titles] of Object.entries(depts)) {
  const d = (await prisma.department.findUnique({ where: { name } })) ?? (await prisma.department.create({ data: { id: randomUUID(), name } }));
  for (const t of titles) if (!(await prisma.designation.findFirst({ where: { departmentId: d.id, name: t } }))) await prisma.designation.create({ data: { id: randomUUID(), name: t, departmentId: d.id } });
}
console.log("Reference data ready");
await prisma.$disconnect();
