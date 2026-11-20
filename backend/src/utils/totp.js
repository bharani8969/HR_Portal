import crypto from "node:crypto";
// RFC 6238 TOTP (SHA-1, 30s, 6 digits) compatible with Google/Microsoft Authenticator.
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32(buf) {
  let bits = "", out = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}
export function fromBase32(s) {
  let bits = "";
  for (const c of s.replace(/=+$/, "")) bits += B32.indexOf(c).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
export const newSecret = () => base32(crypto.randomBytes(20));

export function totp(secret, t = Date.now(), digits = 6) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const h = crypto.createHmac("sha1", fromBase32(secret)).update(counter).digest();
  const o = h[19] & 15;
  const n = (((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 10 ** digits;
  return String(n).padStart(digits, "0");
}
export function verifyTotp(secret, code, t = Date.now()) {
  if (!/^\d{6}$/.test(String(code))) return false;
  return [-1, 0, 1].some((w) => crypto.timingSafeEqual(Buffer.from(totp(secret, t + w * 30000)), Buffer.from(code)));
}
