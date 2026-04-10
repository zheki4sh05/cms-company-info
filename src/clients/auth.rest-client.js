const { BadRequestError } = require("../errors/AppError");

function getAuthServiceBaseUrl() {
  const base = process.env.AUTH_SERVICE_URL;
  if (typeof base !== "string" || !base.trim()) {
    throw new Error("Missing required config: AUTH_SERVICE_URL");
  }
  return base.replace(/\/+$/, "");
}

function extractUserId(payload) {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }
  if (payload == null || typeof payload !== "object") {
    return null;
  }

  const candidates = [
    payload.userId,
    payload.user_id,
    payload.id,
    payload.uuid,
    payload.data?.userId,
    payload.data?.user_id,
    payload.data?.id,
    payload.result?.userId,
    payload.result?.id,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

async function getUserIdByEmail(email, bearerToken) {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in current Node runtime");
  }
  const baseUrl = getAuthServiceBaseUrl();
  const url = `${baseUrl}/auth/email-exists?email=${encodeURIComponent(email)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const headers = {};
    if (typeof bearerToken === "string" && bearerToken.trim()) {
      headers.Authorization = bearerToken;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new BadRequestError("User with this email does not exist");
    }
    if (!response.ok) {
      throw new Error(
        `auth-service user lookup failed: ${response.status} ${response.statusText}`
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      const userId = extractUserId(data);
      if (userId) return userId;
      throw new BadRequestError("Invalid auth-service user lookup response");
    }

    const raw = (await response.text()).trim();
    if (!raw || raw.toLowerCase() === "false") {
      throw new BadRequestError("User with this email does not exist");
    }
    const userId = extractUserId(raw);
    if (userId) return userId;

    // Some servers return JSON with text/plain content-type.
    try {
      const parsed = JSON.parse(raw);
      const parsedUserId = extractUserId(parsed);
      if (parsedUserId) return parsedUserId;
    } catch {
      // ignore parse error and fallthrough
    }

    throw new BadRequestError("Invalid auth-service user lookup response");
  } finally {
    clearTimeout(timeout);
  }
}

async function getEmployeeByUserId(userId, bearerToken) {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in current Node runtime");
  }
  const baseUrl = getAuthServiceBaseUrl();
  const url = `${baseUrl}/auth/employee/${encodeURIComponent(userId)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const headers = {};
    if (typeof bearerToken === "string" && bearerToken.trim()) {
      headers.Authorization = bearerToken;
    }
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(
        `auth-service employee fetch failed: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    if (data == null || typeof data !== "object") {
      throw new BadRequestError("Invalid auth-service employee response");
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { getUserIdByEmail, getEmployeeByUserId };
