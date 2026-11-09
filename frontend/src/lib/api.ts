export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const TOKEN_KEY = "jala-token";

export function apiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, init?: RequestInit & { auth?: boolean; formData?: boolean }): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  const useAuth = init?.auth !== false;
  const token = getToken();
  if (useAuth && token) headers.set("Authorization", `Bearer ${token}`);

  if (init?.body && !init.formData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && useAuth) {
    setToken(null);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : "Request failed";
    const errors =
      body && typeof body === "object" && "errors" in body && body.errors && typeof body.errors === "object"
        ? (body.errors as Record<string, string[]>)
        : undefined;
    throw new ApiError(message, response.status, errors);
  }

  return body as T;
}
