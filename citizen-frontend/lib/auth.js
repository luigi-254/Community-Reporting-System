export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "crs_citizen_access_token";
const USER_KEY = "crs_citizen_user";

export function getToken() {
  return typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  }
}

export async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
    throw new Error("Unauthorized - please sign in again.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

const LOCAL_DASHBOARD_URLS = {
  ADMIN: "http://localhost:3000",
  OFFICER: "http://localhost:3001",
  CITIZEN: "http://localhost:3002",
};

const ROLE_URLS = {
  CITIZEN: process.env.NEXT_PUBLIC_CITIZEN_APP_URL,
  OFFICER: process.env.NEXT_PUBLIC_GOVERNMENT_APP_URL,
  ADMIN: process.env.NEXT_PUBLIC_ADMIN_APP_URL,
  SUPER_ADMIN: process.env.NEXT_PUBLIC_ADMIN_APP_URL,
};

const ROLE_URL_ENV = {
  CITIZEN: "NEXT_PUBLIC_CITIZEN_APP_URL",
  OFFICER: "NEXT_PUBLIC_GOVERNMENT_APP_URL",
  ADMIN: "NEXT_PUBLIC_ADMIN_APP_URL",
  SUPER_ADMIN: "NEXT_PUBLIC_ADMIN_APP_URL",
};

export function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function getDashboardUrl(role) {
  const normalizedRole = normalizeRole(role);
  const envName = ROLE_URL_ENV[normalizedRole];
  if (!envName) {
    throw new Error("This account does not have a dashboard configured.");
  }

  const configuredUrl = ROLE_URLS[normalizedRole]?.trim();
  const value =
    configuredUrl ||
    (process.env.NODE_ENV === "production"
      ? ""
      : LOCAL_DASHBOARD_URLS[normalizedRole]);

  if (!value) {
    throw new Error(
      `Set ${envName} to the public URL for this account's dashboard.`
    );
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${envName} must be a valid absolute URL.`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${envName} must use HTTP or HTTPS.`);
  }

  return parsed.origin;
}

export async function createDashboardHandoff(accessToken, user) {
  const response = await fetch(`${API_URL}/api/auth/handoff`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Could not start a secure dashboard sign-in.");
  }

  const code = result?.data?.code;
  if (!code) {
    throw new Error("The server did not return a secure sign-in code.");
  }

  const role = normalizeRole(user?.role);
  const dashboardUrl = getDashboardUrl(role);
  // This intentionally navigates to a separate dashboard origin.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `${dashboardUrl}/auth/callback#code=${encodeURIComponent(code)}`;
}
