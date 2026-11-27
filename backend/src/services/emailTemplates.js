import { env } from "../config/env.js";

export const esc = (v = "") => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const safeUrl = (u = "") => (/^https?:\/\//i.test(u) ? u : "");

// Branded HTML + plain-text versions. Everything user-supplied is escaped; links must be http(s).
export function renderEmail({ title, lines = [], button, quote, note }) {
  const brand = env.BRAND_PRIMARY, url = button ? safeUrl(button.url) : "";
  const html = `<!doctype html><html><body style="margin:0;background:#F4F7FE;font-family:Arial,Helvetica,sans-serif;color:#0B1F4B">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #E4EAF7;border-radius:16px">
<tr><td style="padding:28px 32px 4px;font-size:20px;font-weight:800;color:${esc(brand)}">${esc(env.CLIENT_NAME)}</td></tr>
<tr><td style="padding:8px 32px 8px">
<h1 style="font-size:20px;margin:12px 0 8px;color:#0B1F4B">${esc(title)}</h1>
${lines.map((l) => `<p style="font-size:15px;line-height:1.6;color:#34445F;margin:10px 0">${esc(l)}</p>`).join("\n")}
${quote ? `<div style="margin:14px 0;padding:14px 16px;background:#F4F7FE;border-left:4px solid ${esc(brand)};border-radius:8px;font-size:14px;line-height:1.6;color:#0B1F4B;white-space:pre-wrap">${esc(quote)}</div>` : ""}
${url ? `<p style="margin:22px 0"><a href="${esc(url)}" style="background:${esc(brand)};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:15px;display:inline-block">${esc(button.label)}</a></p>
<p style="font-size:12px;color:#6B7A99;word-break:break-all;margin:0 0 8px">If the button does not work, copy this link into your browser:<br>${esc(url)}</p>` : ""}
${note ? `<p style="font-size:13px;color:#6B7A99;margin:14px 0">${esc(note)}</p>` : ""}
</td></tr>
<tr><td style="padding:18px 32px 26px;font-size:12px;color:#6B7A99;border-top:1px solid #EEF2FB">${esc(env.APP_NAME)} · Powered by ${esc(env.POWERED_BY)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [env.CLIENT_NAME, "", title, "", ...lines, ...(quote ? ["", quote] : []), ...(url ? ["", `${button.label}: ${url}`] : []), ...(note ? ["", note] : []), "", `${env.APP_NAME} · Powered by ${env.POWERED_BY}`].join("\n");
  return { html, text };
}
