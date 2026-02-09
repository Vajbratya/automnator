import type { NextRequest } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonCreated, jsonError, jsonOk } from "@/lib/api/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const CreateSourceSchema = z.object({
  type: z.enum(["person", "keyword"]),
  name: z.string().min(1),
  profileUrl: z.string().url().optional(),
  keyword: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  const store = getStore();
  const sources = await store.listSources(u.id);
  return jsonOk({ sources });
}

export async function POST(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  let body: z.infer<typeof CreateSourceSchema>;
  try {
    body = CreateSourceSchema.parse(await request.json());
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const store = getStore();
  try {
    const source = await store.createSource(u.id, {
      type: body.type,
      name: body.name,
      profileUrl: body.profileUrl,
      keyword: body.keyword,
    });
    return jsonCreated({ source });
  } catch (err) {
    return jsonError((err as Error).message, 400);
  }
}

