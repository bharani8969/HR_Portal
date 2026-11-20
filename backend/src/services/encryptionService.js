import crypto from "node:crypto";
import { env } from "../config/env.js";

// AES-256-GCM. Stored layout: nonce(12) | tag(16) | ciphertext.
// DEV key comes from env; in production load/unwrap the key through your cloud KMS (see spec section 5).
const key = Buffer.from(env.DATA_ENCRYPTION_KEY, "base64");
export const KEY_VERSION = "v1";

export function encryptBytes(data) {
  const nonce = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, nonce);
  const enc = Buffer.concat([c.update(data), c.final()]);
  return Buffer.concat([nonce, c.getAuthTag(), enc]);
}
export function decryptBytes(buf) {
  const d = crypto.createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]);
}
export const encrypt = (plain) => encryptBytes(Buffer.from(plain, "utf8"));
export const decrypt = (buf) => decryptBytes(buf).toString("utf8");
export const last4 = (v) => v.slice(-4);
