const csrf = () => (document.cookie.split("; ").find((c) => c.startsWith("hrms_csrf=")) || "").split("=")[1] || "";

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// Errors carry `fields` ({ inputName: "message" }) so forms can show text under the exact input.
async function parse(res, path = "") {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) onUnauthorized(); // session ended: back to login
    throw Object.assign(new Error(json?.error?.message || "Request failed"), { status: res.status, code: json?.error?.code, fields: json?.error?.fields || {} });
  }
  return json.data;
}
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api/v1${path}`, {
    method, credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf() },
    body: body ? JSON.stringify(body) : undefined,
  });
  return parse(res, path);
}
export async function apiUpload(path, formData) {
  const res = await fetch(`/api/v1${path}`, { method: "POST", credentials: "include", headers: { "X-CSRF-Token": csrf() }, body: formData });
  return parse(res, path);
}
export async function apiBlob(path) {
  const res = await fetch(`/api/v1${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Could not open the file");
  return res.blob();
}
