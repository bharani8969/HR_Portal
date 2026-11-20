import { env } from "../config/env.js";

// Returns true when a real email was handed to the SMTP server, false in console (development) mode.
export async function sendEmail({ to, subject, text, replyTo }) {
  if (env.EMAIL_DRIVER === "smtp") {
    const nodemailer = (await import("nodemailer")).default;
    await nodemailer.createTransport(env.SMTP_URL).sendMail({ from: env.EMAIL_FROM, to, subject, text, ...(replyTo && { replyTo }) });
    return true;
  }
  console.log(`[email:console] to=${to} subject="${subject}"${replyTo ? ` reply-to=${replyTo}` : ""}\n${text}\n`); // dev only
  return false;
}
