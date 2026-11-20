// Allow-listed categories and magic-byte validation. The browser-supplied MIME type/extension is never trusted.
const sig = {
  pdf: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-",
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
};
const MIME = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" };

export function detectType(buf) {
  for (const ext of Object.keys(sig)) if (buf.length > 8 && sig[ext](buf)) return { ext, mime: MIME[ext] };
  return null;
}
// ASSUMPTION (deferred decision): the 8 standard categories are required for "documents complete".
export const CATEGORIES = {
  CV: { label: "CV", types: ["pdf"], required: true },
  AADHAAR: { label: "Aadhaar Card", types: ["pdf"], required: true },
  BANK_PROOF: { label: "Bank Proof", types: ["pdf"], required: true },
  EDUCATION_PROOF: { label: "Education Proof", types: ["pdf"], required: true },
  PREVIOUS_EMPLOYMENT: { label: "Previous Employment Proof", types: ["pdf"], required: true },
  OFFER_LETTER: { label: "Offer Letter", types: ["pdf"], required: true },
  PAN_CARD: { label: "PAN Card", types: ["pdf"], required: true },
  PHOTO: { label: "Photo", types: ["jpg", "png"], required: true },
  ADDITIONAL: { label: "Additional Document", types: ["pdf"], required: false },
};
export const REQUIRED = Object.keys(CATEGORIES).filter((k) => CATEGORIES[k].required);

export function validateUpload(category, buf) {
  const rule = CATEGORIES[category];
  if (!rule) return { ok: false, error: "Unknown category" };
  if (!buf?.length) return { ok: false, error: "Empty file" };
  const type = detectType(buf);
  if (!type || !rule.types.includes(type.ext)) return { ok: false, error: `File content must be ${rule.types.join(" or ").toUpperCase()}` };
  return { ok: true, type };
}
export const safeFileName = (n = "file") => n.replace(/[\\/\0-\x1f"]/g, "_").slice(0, 200) || "file";
