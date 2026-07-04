// In production with a separate backend, set VITE_API_URL to the backend origin.
// In dev the Vite proxy handles /api requests to localhost:5000.
const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function startReport(input) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to start research");
  return data;
}

export async function getReport(id) {
  const res = await fetch(`${API_BASE}/api/reports/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load report");
  return data;
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

export function pdfUrl(id) {
  return `${API_BASE}/api/reports/${id}/pdf`;
}
