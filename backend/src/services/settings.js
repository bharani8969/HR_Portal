import { prisma } from "../config/database.js";
import { env } from "../config/env.js";

export async function getSetting(key) { return (await prisma.appSetting.findUnique({ where: { key } }))?.value ?? null; }
export async function setSetting(key, value, userId) {
  await prisma.appSetting.upsert({ where: { key }, update: { value, updatedBy: userId }, create: { key, value, updatedBy: userId } });
}
// Where "Powered by" concerns are delivered: the Admin's list, or CONCERN_TO_EMAIL until the Admin sets one.
export async function getConcernRecipients() {
  const v = await getSetting("concern_recipients");
  return Array.isArray(v) && v.length ? v : [env.CONCERN_TO_EMAIL];
}
