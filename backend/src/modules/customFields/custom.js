// Pure validation helpers (no database import, so they are unit-testable).
const empty = (v) => v === undefined || v === null || v === "";

// Returns { "customData.<key>": "message" } or null. Server-side truth for Admin-defined fields.
export function checkCustom(values = {}, defs, { requireAll = false, skipUnknown = false } = {}) {
  const errs = {};
  const keys = new Set(defs.map((d) => d.fieldKey));
  if (!skipUnknown) for (const k of Object.keys(values)) if (!keys.has(k)) errs[`customData.${k}`] = "This field is no longer available";
  for (const d of defs) {
    const v = values[d.fieldKey], key = `customData.${d.fieldKey}`;
    if (empty(v)) { if (requireAll && d.required) errs[key] = "This field is required"; continue; }
    if (d.fieldType === "NUMBER" && !Number.isFinite(Number(v))) errs[key] = "Enter a valid number";
    else if (d.fieldType === "DATE" && Number.isNaN(Date.parse(v))) errs[key] = "Enter a valid date";
    else if (d.fieldType === "DROPDOWN" && !(d.options ?? []).includes(String(v))) errs[key] = "Choose a valid option";
    else if (d.fieldType === "TEXT" && String(v).length > 200) errs[key] = "Must be at most 200 characters";
  }
  return Object.keys(errs).length ? errs : null;
}

// Keeps values of fields that were later removed (history) and applies the new ones.
export function mergeCustom(existing, incoming, defs) {
  const out = { ...existing };
  if (!incoming) return out;
  const by = new Map(defs.map((d) => [d.fieldKey, d]));
  for (const [k, v] of Object.entries(incoming)) {
    const d = by.get(k); if (!d) continue;
    if (empty(v)) delete out[k]; else out[k] = d.fieldType === "NUMBER" ? Number(v) : String(v);
  }
  return out;
}
