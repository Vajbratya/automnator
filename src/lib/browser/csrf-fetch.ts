"use client";

import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getCookieValue(name: string): string | null {
  // Very small cookie helper; good enough for CSRF token lookup.
  const parts = document.cookie.split(";").map((p) => p.trim());
  const prefix = `${encodeURIComponent(name)}=`;
  for (const p of parts) {
    if (p.startsWith(prefix)) return decodeURIComponent(p.slice(prefix.length));
  }
  return null;
}

export async function csrfFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers ?? {});

  if (STATE_CHANGING_METHODS.has(method) && !headers.has(CSRF_HEADER)) {
    const token = getCookieValue(CSRF_COOKIE);
    if (token) headers.set(CSRF_HEADER, token);
  }

  return fetch(input, { ...init, headers });
}

export async function csrfFetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<T> {
  const res = await csrfFetch(input, init);
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data && typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

