import type { NextRequest } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/api/http";
import { GeneratePostInputSchema } from "@/lib/ai/types";
import { generateMockPost, scoreDraftHeuristics } from "@/lib/ai/mock";
import { generateOpenRouterPosts } from "@/lib/ai/openrouter";
import { getServerEnv } from "@/lib/env";

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

  const env = getServerEnv();

  const posts = env.MOCK_AI
    ? Array.from({ length: body.variantCount }, (_, i) => {
        const post = generateMockPost(body);
        const variantHook = body.variantCount > 1 ? `${post.hook} (v${i + 1})` : post.hook;
        const fullText = post.fullText.replace(post.hook, variantHook);
        return { ...post, hook: variantHook, fullText };
      })
    : await generateOpenRouterPosts(body);

  const variants = posts.map((post) => {
    const score = scoreDraftHeuristics(post.fullText);
    return { ...post, score };
  });

  return jsonOk({ variants });
}
