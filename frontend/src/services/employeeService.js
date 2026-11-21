import { api } from "./apiClient.js";
const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== "" && v != null)).toString();

export const listEmployees = (params, opts) => api(`/employees?${qs(params)}`, opts);
export const getEmployee = (id) => api(`/employees/${id}`);
export const createEmployee = (body) => api("/employees", { method: "POST", body });
export const updateEmployee = (id, body) => api(`/employees/${id}`, { method: "PUT", body });
export const archiveEmployee = (id) => api(`/employees/${id}`, { method: "DELETE" });
export const getSensitive = (id) => api(`/employees/${id}/sensitive-data`);
export const saveSensitive = (id, body) => api(`/employees/${id}/sensitive-data`, { method: "PUT", body });
export const listDepartments = () => api("/departments");
