import type { NextRequest } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/api/http";
import { generatePlan } from "@/lib/ai/planner";
import { scoreDraftHeuristics } from "@/lib/ai/mock";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const BodySchema = z.object({
  language: z.enum(["en", "pt-BR"]).default("en"),
  niche: z.string().min(1),
  tone: z.string().min(1).optional(),
  goal: z.string().min(1).optional(),
  postCount: z.number().int().min(1).max(10).default(5),
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

  const store = getStore();
  const [sources, captures] = await Promise.all([
    store.listSources(u.id),
    store.listCaptures(u.id),
  ]);

  try {
    const posts = await generatePlan({
      language: body.language,
      niche: body.niche,
      tone: body.tone,
      goal: body.goal,
      postCount: body.postCount,
      sources,
      captures: captures.slice(0, 30),
    });

    const planned = posts.map((p) => ({
      ...p,
      score: scoreDraftHeuristics(p.fullText),
    }));

    return jsonOk({ posts: planned });
  } catch (err) {
    return jsonError((err as Error).message, 400);
  }
}

