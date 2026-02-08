import type { NextRequest } from "next/server";

import { parseSessionToken, getSessionCookieName } from "@/lib/auth/session";
import type { User } from "@/lib/store/types";

export type RequestUser = Pick<User, "id" | "email">;

export function getUserFromRequest(request: NextRequest): RequestUser | null {
  const token = request.cookies.get(getSessionCookieName())?.value;
  if (!token) return null;
  const parsed = parseSessionToken(token);
  if (!parsed) return null;
  return { id: parsed.userId, email: parsed.email };
}

