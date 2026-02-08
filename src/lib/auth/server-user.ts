import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionCookieName, parseSessionToken } from "@/lib/auth/session";

export type ServerUser = {
  id: string;
  email: string;
};

export async function getServerUser(): Promise<ServerUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) return null;
  const parsed = parseSessionToken(token);
  if (!parsed) return null;
  return { id: parsed.userId, email: parsed.email };
}

export async function requireServerUser(nextPath?: string): Promise<ServerUser> {
  const u = await getServerUser();
  if (u) return u;

  const next = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
  redirect(`/sign-in${next}`);
}
