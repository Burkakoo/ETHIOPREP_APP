const rawApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
const API_URL = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`;

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("ethioprep_token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}

export function saveSession(session) {
  localStorage.setItem("ethioprep_token", session.token);
  localStorage.setItem("ethioprep_user", JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem("ethioprep_token");
  localStorage.removeItem("ethioprep_user");
}
