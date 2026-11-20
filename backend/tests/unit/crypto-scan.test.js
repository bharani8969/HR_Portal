import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
const { encrypt, decrypt, last4 } = await import("../../src/services/encryptionService.js");
const { scan } = await import("../../src/services/scanService.js");

test("AES-256-GCM round trip and unique nonces", () => {
  const a = encrypt("123412341234"), b = encrypt("123412341234");
  assert.equal(decrypt(a), "123412341234");
  assert.notDeepEqual(a, b);
  assert.ok(!a.toString("utf8").includes("1234123412"));
  assert.equal(last4("123412345678"), "5678");
});
test("tampered ciphertext is rejected (authenticated encryption)", () => {
  const a = encrypt("ABCDE1234F");
  a[a.length - 1] ^= 1;
  assert.throws(() => decrypt(a));
});
test("scanner flags the EICAR test file and passes clean content", async () => {
  const eicar = Buffer.from("%PDF-1.4\n" + "X5O!P%@AP[4\\PZX54(P^)7CC)7}$" + "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
  assert.equal(await scan(eicar), "INFECTED");
  assert.equal(await scan(Buffer.from("%PDF-1.4 clean")), "CLEAN");
});

const { encryptBytes, decryptBytes } = await import("../../src/services/encryptionService.js");
test("document bytes: encrypted round trip, no plaintext in storage, tamper-evident", () => {
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\nSECRET-SALARY-12345\n"), Buffer.alloc(200000, 7)]);
  const stored = encryptBytes(pdf);
  assert.equal(stored.length, pdf.length + 28, "nonce(12) + tag(16) overhead only");
  assert.ok(!stored.includes(Buffer.from("SECRET-SALARY")), "plaintext must not appear in the stored bytes");
  assert.ok(decryptBytes(stored).equals(pdf));
  stored[100] ^= 1;
  assert.throws(() => decryptBytes(stored));
});
