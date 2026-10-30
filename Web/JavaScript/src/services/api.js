const rawApiUrl = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
const API_URL = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`;

let webRefreshPromise = null;

async function tryRefreshWebAccessToken() {
  if (webRefreshPromise) {
    return webRefreshPromise;
  }

  webRefreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem("ethioprep_refresh_token");
      if (!refreshToken) return null;

      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 400) {
          localStorage.removeItem("ethioprep_refresh_token");
        }
        return null;
      }

      const data = await response.json().catch(() => ({}));
      if (data.accessToken) {
        localStorage.setItem("ethioprep_token", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("ethioprep_refresh_token", data.refreshToken);
        }
        return data.accessToken;
      }
      return null;
    } catch {
      return null;
    } finally {
      webRefreshPromise = null;
    }
  })();

  return webRefreshPromise;
}

const WEB_API_BACKUP_PREFIX = "ethioprep_web_api_cache_v1:";

function saveWebApiBackup(path, data) {
  try {
    localStorage.setItem(`${WEB_API_BACKUP_PREFIX}${path}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function readWebApiBackup(path) {
  try {
    const raw = localStorage.getItem(`${WEB_API_BACKUP_PREFIX}${path}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}, isRetry = false) {
  const token = localStorage.getItem("ethioprep_token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const method = String(options.method || "GET").toUpperCase();

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, headers });

    if (
      response.status === 401 &&
      !isRetry &&
      !path.startsWith("/auth/login") &&
      !path.startsWith("/auth/refresh-token")
    ) {
      const newAccessToken = await tryRefreshWebAccessToken();
      if (newAccessToken) {
        return apiRequest(path, options, true);
      }
    }

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (method === "GET") {
        const cached = readWebApiBackup(path);
        if (cached) return cached;
      }
      const error = new Error(body.error || "Request failed.");
      error.status = response.status;
      error.requiresVerification = body.requiresVerification;
      error.email = body.email;
      error.data = body;
      throw error;
    }

    if (method === "GET") {
      saveWebApiBackup(path, body);
    }
    return body;
  } catch (err) {
    if (method === "GET") {
      const cached = readWebApiBackup(path);
      if (cached) return cached;
    }
    throw err;
  }
}

export function saveSession(session) {
  if (session.accessToken) {
    localStorage.setItem("ethioprep_token", session.accessToken);
  }
  if (session.refreshToken) {
    localStorage.setItem("ethioprep_refresh_token", session.refreshToken);
  }
  if (session.user) {
    localStorage.setItem("ethioprep_user", JSON.stringify(session.user));
  }
}

export function clearSession() {
  localStorage.removeItem("ethioprep_token");
  localStorage.removeItem("ethioprep_refresh_token");
  localStorage.removeItem("ethioprep_user");
}
