import crypto from "node:crypto";
export const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const randomToken = () => crypto.randomBytes(32).toString("base64url");
export const uuid = () => crypto.randomUUID();
export const ok = (data) => ({ success: true, data });
export const fail = (message, fields) => ({ success: false, error: { message, ...(fields && { fields }) } });

// Turns zod issues into { fieldName: "friendly message" } so the UI can show them under the exact input.
export function fieldErrors(error, regexMsg = {}) {
  const out = {};
  for (const i of error.issues) {
    const key = i.path.join(".") || "_";
    if (out[key]) continue;
    let m = "Invalid value";
    if (i.code === "invalid_type") m = i.expected === "date" ? "Enter a valid date" : "This field is required";
    else if (i.code === "too_small") m = i.origin === "string" ? (i.minimum <= 1 ? "This field is required" : `Must be at least ${i.minimum} characters`) : "Value is too small";
    else if (i.code === "too_big") m = i.origin === "string" ? `Must be at most ${i.maximum} characters` : "Value is too large";
    else if (i.code === "invalid_format") m = i.format === "email" ? "Enter a valid email address" : i.format === "uuid" ? "Choose a valid option" : regexMsg[key] ?? "Invalid format";
    else if (i.code === "invalid_value") m = "Choose a valid option";
    else if (i.code === "custom") m = i.message;
    out[key] = m;
  }
  return out;
}
export const fieldsFail = (res, fields, status = 422) => res.status(status).json(fail("Please correct the highlighted fields", fields));
export const zodFail = (res, error, regexMsg) => fieldsFail(res, fieldErrors(error, regexMsg));
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
