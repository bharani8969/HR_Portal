import { z } from "zod";
const email = z.string().email().max(254);

// Validates the Admin-managed list of destination emails.
export function parseRecipients(input) {
  if (!Array.isArray(input)) return { ok: false, error: "Provide a list of email addresses" };
  const out = [];
  for (const raw of input) {
    const v = String(raw ?? "").trim().toLowerCase();
    if (!v) continue;
    if (!email.safeParse(v).success) return { ok: false, error: `"${v.slice(0, 60)}" is not a valid email address` };
    if (!out.includes(v)) out.push(v);
  }
  if (out.length < 1) return { ok: false, error: "Add at least one destination email" };
  if (out.length > 5) return { ok: false, error: "You can add up to 5 destination emails" };
  return { ok: true, value: out };
}
