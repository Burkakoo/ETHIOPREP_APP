import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

export async function request(path, options = {}) {
  const token = await AsyncStorage.getItem("ethioprep_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed.");
  return body;
}

export async function login(email, password) {
  const result = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  if (result.accessToken) {
    await AsyncStorage.setItem("ethioprep_token", result.accessToken);
  }
  if (result.user) {
    await AsyncStorage.setItem("ethioprep_user", JSON.stringify(result.user));
  }
  return result;
}

export async function register({ email, password, displayName, phoneNumber, stream = "natural" }) {
  const result = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName, phoneNumber, stream })
  });
  if (result.accessToken) {
    await AsyncStorage.setItem("ethioprep_token", result.accessToken);
  }
  if (result.user) {
    await AsyncStorage.setItem("ethioprep_user", JSON.stringify(result.user));
  }
  return result;
}

export async function updateStream(stream) {
  const result = await request("/auth/stream", {
    method: "PATCH",
    body: JSON.stringify({ stream })
  });
  if (result.user) {
    await AsyncStorage.setItem("ethioprep_user", JSON.stringify(result.user));
  }
  return result;
}

export async function getProfile() {
  return await request("/auth/profile");
}

export async function updateProfile({ displayName, phoneNumber, email, telegramLink, qa, notifications }) {
  const result = await request("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ displayName, phoneNumber, email, telegramLink, qa, notifications })
  });
  if (result.user) {
    await AsyncStorage.setItem("ethioprep_user", JSON.stringify(result.user));
  }
  return result;
}

export async function updatePassword(currentPassword, newPassword) {
  return await request("/auth/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword })
  });
}


export async function requestWithOfflineQueue(path, options, change) {
  try {
    return { online: true, result: await request(path, options) };
  } catch (error) {
    if (error instanceof TypeError) {
      const { queueMutation } = await import("./offlineQueue.js");
      return { online: false, queued: await queueMutation(change), error };
    }
    throw error;
  }
}

export async function logout() {
  await AsyncStorage.multiRemove(["ethioprep_token", "ethioprep_user"]);
}
