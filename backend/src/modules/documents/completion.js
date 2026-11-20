import { prisma } from "../../config/database.js";
import { REQUIRED } from "../../utils/files.js";

// "Documents complete" = every required category has a current CLEAN file (infected/failed uploads never become current).
export async function fullyDocumented(employeeWhere) {
  const g = await prisma.employeeDocument.groupBy({ by: ["employeeId"], where: { status: "ACTIVE", documentType: { in: REQUIRED }, employee: employeeWhere }, _count: { _all: true } });
  return new Set(g.filter((x) => x._count._all >= REQUIRED.length).map((x) => x.employeeId));
}
