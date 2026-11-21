import { begin } from "./loadingStore.js";

const csrf = () => (document.cookie.split("; ").find((c) => c.startsWith("hrms_csrf=")) || "").split("=")[1] || "";

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

const TIMEOUT_MS = 90000;                      // a sleeping free server can take about a minute to wake
const RETRY_STATUS = new Set([502, 503, 504]); // gateway errors while the server wakes up
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Errors carry `fields` ({ inputName: "message" }) so forms can show text under the exact input.
async function parse(res, path = "") {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) onUnauthorized(); // session ended: back to login
    throw Object.assign(new Error(json?.error?.message || "Request failed"), { status: res.status, code: json?.error?.code, fields: json?.error?.fields || {} });
  }
  return json.data;
}

// Timeout + friendly network errors. Safe (GET) requests retry twice while the server is waking up.
async function send(url, init, { retry }) {
  for (let attempt = 0; ; attempt++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: ctl.signal });
      if (retry && RETRY_STATUS.has(res.status) && attempt < 2) { await wait(1500 * (attempt + 1)); continue; }
      return res;
    } catch (e) {
      if (retry && e.name !== "AbortError" && attempt < 2) { await wait(1500 * (attempt + 1)); continue; }
      throw Object.assign(new Error(e.name === "AbortError" ? "The server is taking too long to respond. Please try again." : "Cannot reach the server. Check your connection and try again."), { status: 0, fields: {} });
    } finally { clearTimeout(timer); }
  }
}

// Identical requests that are still running share one promise: a double click or a re-render never doubles the load.
const inflight = new Map();
function tracked(key, loading, fn) {
  if (key && inflight.has(key)) return inflight.get(key);
  const done = begin(loading);
  const p = fn().finally(() => { done(); if (key) inflight.delete(key); });
  if (key) inflight.set(key, p);
  return p;
}

// quiet: only the thin top bar (use where the page already shows skeletons). label/delay: loader text and start delay (ms).
export function api(path, { method = "GET", body, quiet = false, label, delay } = {}) {
  const key = `${method} ${path} ${body ? JSON.stringify(body) : ""}`;
  return tracked(key, { blocking: !quiet, label, delay: delay ?? (method === "GET" ? 400 : 120) }, async () => {
    const res = await send(`/api/v1${path}`, {
      method, credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() },
      body: body ? JSON.stringify(body) : undefined,
    }, { retry: method === "GET" });
    return parse(res, path);
  });
}
export function apiUpload(path, formData, { label = "Scanning and saving your file…" } = {}) {
  return tracked(null, { blocking: true, delay: 0, label }, async () => {
    const res = await send(`/api/v1${path}`, { method: "POST", credentials: "include", headers: { "X-CSRF-Token": csrf() }, body: formData }, { retry: false });
    return parse(res, path);
  });
}
export function apiBlob(path, { label = "Preparing your file…" } = {}) {
  return tracked(`BLOB ${path}`, { blocking: true, delay: 0, label }, async () => {
    const res = await send(`/api/v1${path}`, { credentials: "include" }, { retry: true });
    if (!res.ok) throw new Error("Could not open the file");
    return res.blob();
  });
}
