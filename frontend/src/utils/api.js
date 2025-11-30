// src/api.js
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// --------- REPORTS ---------

// LIST (GET /reports/)
export const getReports = (params = {}) => {
  const query = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== undefined && v !== null && v !== ""
      )
    )
  ).toString();

  const suffix = query ? `?${query}` : "";
  // NOTE: trailing slash here
  return apiFetch(`/reports/${suffix}`);
};

// DETAIL (GET /reports/{id})
export const getReport = (id) => apiFetch(`/reports/${id}`);

// CREATE (POST /reports/)
export const createReport = (payload) =>
  apiFetch("/reports/", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// UPDATE STATUS (PUT /reports/{id}/status)
export const updateReportStatus = (id, payload) =>
  apiFetch(`/reports/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

// DELETE (DELETE /reports/{id})
export const deleteReport = (id) =>
  apiFetch(`/reports/${id}`, { method: "DELETE" });

// --------- REF DATA ---------
export const getServiceAreas = () => apiFetch("/service-areas");
export const getCategories = () => apiFetch("/categories");
export const getSeverities = () => apiFetch("/severities");
export const getStatuses = () => apiFetch("/statuses");

export default apiFetch;
