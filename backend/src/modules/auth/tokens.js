import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { randomToken, sha256, uuid } from "../../utils/helpers.js";

// Short-lived, single-use, hashed-at-rest tokens (password reset and HR invitation).
export async function issueResetToken(userId, minutes) {
  await prisma.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  const raw = randomToken();
  await prisma.passwordResetToken.create({ data: { id: uuid(), userId, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + minutes * 60000) } });
  return `${env.APP_BASE_URL}/reset-password?token=${raw}`;
}
