import type { NextRequest } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/api/http";
import { GeneratePostInputSchema } from "@/lib/ai/types";
import { generateMockPost, scoreDraftHeuristics } from "@/lib/ai/mock";

export const runtime = "nodejs";

const BodySchema = GeneratePostInputSchema;

export async function POST(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const variants = Array.from({ length: body.variantCount }, (_, i) => {
    const post = generateMockPost(body);
    const variantHook = body.variantCount > 1 ? `${post.hook} (v${i + 1})` : post.hook;
    const fullText = post.fullText.replace(post.hook, variantHook);
    const score = scoreDraftHeuristics(fullText);
    return { ...post, hook: variantHook, fullText, score };
  });

  return jsonOk({ variants });
}

