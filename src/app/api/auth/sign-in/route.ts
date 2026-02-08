import type { NextRequest } from "next/server";
import { z } from "zod";

import { createSessionToken, getSessionCookieName } from "@/lib/auth/session";
import { jsonCreated, jsonError } from "@/lib/api/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const store = getStore();
  const user = await store.getOrCreateUserByEmail(body.email);

  const token = createSessionToken({ userId: user.id, email: user.email });
  const response = jsonCreated({ ok: true, user: { id: user.id, email: user.email } });

  response.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
