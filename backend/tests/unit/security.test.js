import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { totp, verifyTotp, newSecret, base32 } from "../../src/utils/totp.js";
import { detectType, validateUpload, safeFileName, REQUIRED } from "../../src/utils/files.js";

const pdf = Buffer.from("%PDF-1.4\n%fake test pdf content\n");
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);

test("TOTP matches RFC 6238 test vectors (SHA-1)", () => {
  const secret = base32(Buffer.from("12345678901234567890"));
  assert.equal(totp(secret, 59000), "287082");
  assert.equal(totp(secret, 1111111109000), "081804");
  assert.equal(totp(secret, 2000000000000), "279037");
});
test("TOTP verify accepts +/-1 step, rejects others and bad formats", () => {
  const s = newSecret(), t = 1_700_000_000_000;
  assert.ok(verifyTotp(s, totp(s, t), t));
  assert.ok(verifyTotp(s, totp(s, t - 30000), t));
  assert.ok(!verifyTotp(s, totp(s, t - 120000), t));
  assert.ok(!verifyTotp(s, "12345", t));
  assert.ok(!verifyTotp(s, "abcdef", t));
});
test("file type is detected from magic bytes, not names", () => {
  assert.equal(detectType(pdf).ext, "pdf");
  assert.equal(detectType(png).ext, "png");
  assert.equal(detectType(jpg).ext, "jpg");
  assert.equal(detectType(Buffer.from("MZ\x90\x00 pretend.pdf executable bytes")), null);
  assert.equal(detectType(Buffer.from("<html><script>alert(1)</script></html>")), null);
});
test("category rules: PDF-only categories reject images, PHOTO rejects PDF", () => {
  assert.ok(validateUpload("CV", pdf).ok);
  assert.ok(!validateUpload("CV", png).ok);
  assert.ok(validateUpload("PHOTO", png).ok && validateUpload("PHOTO", jpg).ok);
  assert.ok(!validateUpload("PHOTO", pdf).ok);
  assert.ok(validateUpload("ADDITIONAL", pdf).ok);
  assert.ok(!validateUpload("NOPE", pdf).ok);
  assert.ok(!validateUpload("CV", Buffer.alloc(0)).ok);
});
test("required categories exclude ADDITIONAL", () => {
  assert.equal(REQUIRED.length, 8);
  assert.ok(!REQUIRED.includes("ADDITIONAL"));
});
test("file names are sanitised", () => {
  assert.equal(safeFileName('..\\..\\evil"\n.pdf').includes("\\"), false);
  assert.ok(safeFileName("a".repeat(500)).length <= 200);
});
