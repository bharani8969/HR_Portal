import { prisma } from "../../config/database.js";
export const activeDefs = () => prisma.customField.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
