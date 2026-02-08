export const CSRF_COOKIE = "am_csrf";
export const CSRF_HEADER = "x-csrf-token";

export function newCsrfToken(): string {
  // UUID is plenty for CSRF double-submit tokens.
  // Use Web Crypto so this works in Next.js Middleware (Edge runtime) and Node.
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  // Extremely unlikely fallback. (Prefer configuring/running in an environment
  // where crypto.randomUUID exists.)
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

export function isCsrfValid(cookieValue: string | undefined, headerValue: string | null): boolean {
  if (!cookieValue) return false;
  if (!headerValue) return false;
  return cookieValue === headerValue;
}
