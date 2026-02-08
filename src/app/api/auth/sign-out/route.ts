import type { NextRequest } from "next/server";

import { jsonOk } from "@/lib/api/http";
import { getSessionCookieName } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = jsonOk({ ok: true });
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 0,
  });
  return response;
}
