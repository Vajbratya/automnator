import type { NextRequest } from "next/server";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/api/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  const store = getStore();
  const schedules = await store.listSchedules(u.id);
  const pending = schedules.filter(
    (s) => s.approvalState === "pending" && s.status === "queued"
  );

  return jsonOk({ approvals: pending });
}

