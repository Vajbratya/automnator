import type { NextRequest } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/http";
import { getUserFromRequest } from "@/lib/auth/request-user";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  const store = getStore();
  const user = await store.getUserById(u.id);
  if (!user) return jsonError("Unauthorized", 401);

  return jsonOk({ user: { id: user.id, email: user.email } });
}

