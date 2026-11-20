// One place for white-labelling. Values come from VITE_* env vars at build time (see .env.example).
const e = import.meta.env;
// Runtime branding served by the API at /brand.js wins over build-time VITE_* values (one build serves any client).
const rt = (typeof window !== "undefined" && window.__BRAND__) || {};
export const BRAND = {
  clientName: rt.clientName || e.VITE_CLIENT_NAME || "HRS Tech",
  appName: rt.appName || e.VITE_APP_NAME || "PeopleVault",
  tagline: rt.tagline || e.VITE_APP_TAGLINE || "Employee Records, Securely Kept",
  poweredBy: rt.poweredBy || e.VITE_POWERED_BY || "TREZION Technology",
  primary: rt.primary || e.VITE_BRAND_PRIMARY || "#2F6BFF",
  accent: rt.accent || e.VITE_BRAND_ACCENT || "#18D5C8",
  dark: rt.dark || e.VITE_BRAND_DARK || "#0B1F4B",
  logoUrl: rt.logoUrl || e.VITE_CLIENT_LOGO || "",
};
export const monogram = (BRAND.clientName.trim()[0] || "H").toUpperCase();

export function applyBrand() {
  const r = document.documentElement.style;
  r.setProperty("--blue", BRAND.primary);
  r.setProperty("--teal", BRAND.accent);
  r.setProperty("--navy", BRAND.dark);
  r.setProperty("--navy2", `color-mix(in srgb, ${BRAND.dark} 70%, ${BRAND.primary})`);
  document.title = `${BRAND.appName} | ${BRAND.clientName}`;
}
