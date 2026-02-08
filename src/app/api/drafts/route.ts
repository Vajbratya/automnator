import type { NextRequest } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonCreated, jsonError, jsonOk } from "@/lib/api/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const CreateDraftSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  language: z.enum(["en", "pt-BR"]).optional(),
});

export async function GET(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  const store = getStore();
  const drafts = await store.listDrafts(u.id);
  return jsonOk({ drafts });
}

export async function POST(request: NextRequest) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  let body: z.infer<typeof CreateDraftSchema>;
  try {
    body = CreateDraftSchema.parse(await request.json());
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const store = getStore();
  const draft = await store.createDraft(u.id, {
    title: body.title ?? "Untitled draft",
    content: body.content ?? "",
    language: body.language ?? "en",
  });
  return jsonCreated({ draft });
}

