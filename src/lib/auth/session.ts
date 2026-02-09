import { createHmac } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

type SessionPayload = {
  userId: string;
  email: string;
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function getSessionSecret(): string | null {
  const env = getServerEnv();
  const secret = process.env.APP_SESSION_SECRET?.trim();
  if (secret) return secret;
  if (env.NODE_ENV === "production") {
    // Make preview deploys usable without manual env setup.
    // Never do this for real production deployments.
    const isVercelPreview =
      Boolean(process.env.VERCEL) && process.env.VERCEL_ENV === "preview";
    if (isVercelPreview) return "vercel-preview-insecure-secret";
    return null;
  }
  // Dev fallback to keep the app usable locally without configuration.
  return "dev-insecure-secret";
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function createSessionToken(payload: SessionPayload): string {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Missing APP_SESSION_SECRET in production.");

  const data = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(data, secret);
  return `${data}.${sig}`;
}

export function parseSessionToken(token: string): SessionPayload | null {
  const secret = getSessionSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;

  const expected = sign(data, secret);
  if (sig !== expected) return null;

  try {
    const obj = JSON.parse(base64UrlDecode(data)) as SessionPayload;
    if (!obj?.userId || !obj?.email) return null;
    return obj;
  } catch {
    return null;
  }
}
