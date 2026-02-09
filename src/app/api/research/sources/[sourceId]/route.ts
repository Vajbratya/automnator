import type { NextRequest } from "next/server";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/api/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, context: { params: Promise<{ sourceId: string }> }) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  const { sourceId } = await context.params;
  const store = getStore();
  await store.deleteSource(u.id, sourceId);
  return jsonOk({ ok: true });
}

