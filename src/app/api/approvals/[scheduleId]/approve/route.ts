import type { NextRequest } from "next/server";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/api/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ scheduleId: string }> }
) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  const { scheduleId } = await context.params;
  const store = getStore();

  try {
    const schedule = await store.approveSchedule(u.id, scheduleId);
    return jsonOk({ schedule });
  } catch (err) {
    return jsonError((err as Error).message, 400);
  }
}

