import type { NextRequest } from "next/server";
import { z } from "zod";

import { getUserFromRequest } from "@/lib/auth/request-user";
import { jsonError, jsonOk } from "@/lib/api/http";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const UpdateDraftSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  language: z.enum(["en", "pt-BR"]).optional(),
  status: z.enum(["draft", "scheduled", "published"]).optional(),
  promptVersion: z.string().min(1).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ draftId: string }> }
) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  const { draftId } = await context.params;
  const store = getStore();
  const draft = await store.getDraft(u.id, draftId);
  if (!draft) return jsonError("Not found", 404);

  return jsonOk({ draft });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ draftId: string }> }
) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  const { draftId } = await context.params;

  let body: z.infer<typeof UpdateDraftSchema>;
  try {
    body = UpdateDraftSchema.parse(await request.json());
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const store = getStore();
  try {
    const draft = await store.updateDraft(u.id, draftId, body);
    return jsonOk({ draft });
  } catch (err) {
    return jsonError((err as Error).message, 400);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ draftId: string }> }
) {
  const u = getUserFromRequest(request);
  if (!u) return jsonError("Unauthorized", 401);

  const { draftId } = await context.params;
  const store = getStore();
  await store.deleteDraft(u.id, draftId);
  return jsonOk({ ok: true });
}

