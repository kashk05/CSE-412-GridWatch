// src/utils/api.js
const API_BASE = "http://127.0.0.1:8000";

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data.detail || JSON.stringify(data);
    } catch {
      // ignore
    }
    throw new Error(`API error ${res.status}: ${detail}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ---------- REPORTS ----------

export async function getReports(params = {}) {
  const url = new URL(`${API_BASE}/reports/`);

  if (params.search) url.searchParams.set("search", params.search);
  if (params.area_id) url.searchParams.set("area_id", params.area_id);
  if (params.category_id) url.searchParams.set("category_id", params.category_id);
  if (params.status) url.searchParams.set("status", params.status);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to load reports: ${res.status}`);
  }
  return res.json();
}

export async function getReport(reportId) {
  return apiRequest(`/reports/${reportId}`);
}

export async function createReport(payload) {
  return apiRequest("/reports/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateReportStatus(reportId, payload) {
  return apiRequest(`/reports/${reportId}/status`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteReport(reportId) {
  return apiRequest(`/reports/${reportId}`, {
    method: "DELETE",
  });
}

// ---------- REFDATA (for statuses on detail page) ----------

export async function getStatuses() {
  return apiRequest("/statuses");
}
