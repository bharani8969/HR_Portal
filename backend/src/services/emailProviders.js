import { env } from "../config/env.js";

export const providerName = () => env.EMAIL_DRIVER;
export const isReady = () => (env.EMAIL_DRIVER === "resend" ? !!env.RESEND_API_KEY : env.EMAIL_DRIVER === "smtp" ? !!env.SMTP_URL : false);

// Transport only (no database). Returns { sent, id? }. Throws an Error with the provider's message on failure.
export async function deliver({ to, subject, text, html, replyTo }) {
  const recipients = Array.isArray(to) ? to : [to];
  if (env.EMAIL_DRIVER === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: recipients, subject, text, ...(html && { html }), ...(replyTo && { reply_to: replyTo }) }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || json.error?.message || `Resend rejected the email (HTTP ${res.status})`);
    return { sent: true, id: json.id };
  }
  if (env.EMAIL_DRIVER === "smtp") {
    const nodemailer = (await import("nodemailer")).default;
    const info = await nodemailer.createTransport(env.SMTP_URL).sendMail({ from: env.EMAIL_FROM, to: recipients, subject, text, ...(html && { html }), ...(replyTo && { replyTo }) });
    return { sent: true, id: info.messageId };
  }
  console.log(`[email:console] to=${recipients.join(", ")} subject="${subject}"${replyTo ? ` reply-to=${replyTo}` : ""}\n${text}\n`); // dev only
  return { sent: false };
}
