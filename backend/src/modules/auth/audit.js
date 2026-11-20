import { prisma } from "../../config/database.js";
import { uuid } from "../../utils/helpers.js";
// Never pass secrets or sensitive values in metadata.
export const audit = (actorUserId, action, entityType, entityId, ip, metadata) =>
  prisma.auditLog.create({ data: { id: uuid(), actorUserId, action, entityType, entityId, ip, metadata } }).catch(() => {});
