import type { NextRequest } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/api/http";
import { scoreDraftHeuristics } from "@/lib/ai/mock";

export const runtime = "nodejs";

const BodySchema = z.object({
  text: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  return jsonOk({ score: scoreDraftHeuristics(body.text) });
}

