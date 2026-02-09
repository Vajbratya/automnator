import type { NextRequest } from "next/server";
import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/http";
import { getUserFromRequest } from "@/lib/auth/request-user";
import { generatePlan } from "@/lib/ai/planner";
import { getServerEnv } from "@/lib/env";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const BodySchema = z.object({
  // If not authenticated, you can target a user by email (requires secret).
  email: z.string().email().optional(),
  language: z.enum(["en", "pt-BR"]).default("pt-BR"),
  niche: z.string().min(1),
  tone: z.string().min(1).optional(),
  goal: z.string().min(1).optional(),
  postCount: z.number().int().min(1).max(10).default(3),
  timezone: z.string().min(1).default("UTC"),
  hour: z.number().int().min(0).max(23).default(9),
  minute: z.number().int().min(0).max(59).default(0),
  autoApprove: z.boolean().default(true),
});

function nextBusinessDayAt(hour: number, minute: number, offset: number): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);

  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);

  let added = 0;
  while (added < offset) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay(); // 0 Sun ... 6 Sat
    if (day !== 0 && day !== 6) added += 1;
  }

  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const sessionUser = getUserFromRequest(request);
  const secret = env.WORKER_CRON_SECRET?.trim();

  // If this is called without a session, require secret.
  if (!sessionUser) {
    const provided =
      request.headers.get("x-worker-secret") ??
      request.nextUrl.searchParams.get("secret");
    if (!secret || !provided || provided !== secret) {
      return jsonError("Unauthorized", 401);
    }
    if (!body.email) return jsonError("email is required without a session.", 400);
  }

  const store = getStore();
  const user = sessionUser
    ? await store.getUserById(sessionUser.id)
    : await store.getOrCreateUserByEmail(body.email!);

  if (!user) return jsonError("User not found.", 404);

  const [sources, captures] = await Promise.all([
    store.listSources(user.id),
    store.listCaptures(user.id),
  ]);

  // Generate a batch of posts, then create drafts+schedules.
  const planned = await generatePlan({
    language: body.language,
    niche: body.niche,
    tone: body.tone,
    goal: body.goal,
    postCount: body.postCount,
    sources,
    captures: captures.slice(0, 30),
  });

  const created: Array<{ draftId: string; scheduleId: string; runAt: string }> = [];
  for (let i = 0; i < planned.length; i += 1) {
    const p = planned[i]!;
    const draft = await store.createDraft(user.id, {
      title: p.title,
      content: p.fullText,
      language: body.language,
    });

    const runAt = nextBusinessDayAt(body.hour, body.minute, i).toISOString();
    const schedule = await store.createSchedule(user.id, {
      draftId: draft.id,
      runAt,
      timezone: body.timezone,
    });

    if (body.autoApprove) {
      await store.approveSchedule(user.id, schedule.id);
    }

    created.push({ draftId: draft.id, scheduleId: schedule.id, runAt });
  }

  // If no secret is configured, refuse real publishing in production.
  if (!secret && env.NODE_ENV === "production" && !env.MOCK_LINKEDIN) {
    return jsonError("WORKER_CRON_SECRET is required for non-mock publishing.", 500, {
      created,
    });
  }

  return jsonOk({ ok: true, created });
}
