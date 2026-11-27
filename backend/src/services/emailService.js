import { prisma } from "../config/database.js";
import { deliver, providerName } from "./emailProviders.js";
import { uuid } from "../utils/helpers.js";

// Sends one email and records the outcome in email_logs (never the body: it can contain one-time links).
// Returns true when a real email was handed to the provider, false in console (development) mode. Throws on failure after logging it.
export async function sendEmail({ to, subject, text, html, replyTo, type = "OTHER" }) {
  const list = Array.isArray(to) ? to : [to];
  const record = async (status, extra = {}) => {
    try { await prisma.emailLog.create({ data: { id: uuid(), type, toAddress: list.join(", ").slice(0, 500), subject: subject.slice(0, 200), status, provider: providerName(), ...extra } }); }
    catch (e) { console.error("Could not write email log:", e.message); }
  };
  try {
    const r = await deliver({ to: list, subject, text, html, replyTo });
    await record(r.sent ? "SENT" : "CONSOLE", { providerId: r.id ?? null });
    return r.sent;
  } catch (e) {
    await record("FAILED", { error: String(e.message).slice(0, 500) });
    throw e;
  }
}
