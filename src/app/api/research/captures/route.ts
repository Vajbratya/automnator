import type { NextRequest } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonCreated, jsonError, jsonOk } from "@/lib/api/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const CreateCaptureSchema = z.object({
  sourceId: z.string().min(1).optional(),
  authorName: z.string().min(1),
  authorUrl: z.string().url().optional(),
  postUrl: z.string().url().optional(),
  text: z.string().min(1),
  capturedAt: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  const store = getStore();
  const captures = await store.listCaptures(u.id);
  return jsonOk({ captures });
}

export async function POST(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  let body: z.infer<typeof CreateCaptureSchema>;
  try {
    body = CreateCaptureSchema.parse(await request.json());
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const store = getStore();
  try {
    const capture = await store.createCapture(u.id, body);
    return jsonCreated({ capture });
  } catch (err) {
    return jsonError((err as Error).message, 400);
  }
}

