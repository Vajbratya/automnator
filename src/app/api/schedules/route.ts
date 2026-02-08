import type { NextRequest } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonCreated, jsonError, jsonOk } from "@/lib/api/http";
import { getStore } from "@/lib/store";
import { parseIsoDate } from "@/lib/time";

export const runtime = "nodejs";

const CreateScheduleSchema = z.object({
  draftId: z.string().min(1),
  runAt: z.string().min(1), // ISO datetime
  timezone: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  const store = getStore();
  const schedules = await store.listSchedules(u.id);
  return jsonOk({ schedules });
}

export async function POST(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  let body: z.infer<typeof CreateScheduleSchema>;
  try {
    body = CreateScheduleSchema.parse(await request.json());
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const runAt = parseIsoDate(body.runAt);
  if (!runAt) return jsonError("Invalid runAt datetime.", 400);

  const store = getStore();
  try {
    const schedule = await store.createSchedule(u.id, {
      draftId: body.draftId,
      runAt: runAt.toISOString(),
      timezone: body.timezone,
    });
    return jsonCreated({ schedule });
  } catch (err) {
    return jsonError((err as Error).message, 400);
  }
}

