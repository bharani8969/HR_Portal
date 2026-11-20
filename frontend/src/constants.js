export const DOC_LABELS = { CV: "CV", AADHAAR: "Aadhaar Card", BANK_PROOF: "Bank Proof", EDUCATION_PROOF: "Education Proof", PREVIOUS_EMPLOYMENT: "Previous Employment", OFFER_LETTER: "Offer Letter", PAN_CARD: "PAN Card", PHOTO: "Photo" };
export const SECTIONS = [["PERSONAL", "Personal"], ["EMPLOYMENT", "Employment"], ["BANK", "Statutory & Bank"], ["ADDITIONAL", "Additional (own step)"]];
export const humanize = (a = "") => a.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
