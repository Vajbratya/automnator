import type { NextRequest } from "next/server";

import { jsonError, jsonOk } from "@/lib/api/http";
import { getServerEnv } from "@/lib/env";
import { runWorkerOnce } from "@/lib/worker/run-once";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const env = getServerEnv();

  const secret = env.WORKER_CRON_SECRET?.trim();
  if (secret) {
    const provided =
      request.headers.get("x-worker-secret") ??
      request.nextUrl.searchParams.get("secret");
    if (!provided || provided !== secret) {
      return jsonError("Unauthorized", 401);
    }
  } else {
    // If no secret is configured, refuse to run in production.
    if (env.NODE_ENV === "production") {
      return jsonError("WORKER_CRON_SECRET is required in production.", 500);
    }
  }

  const result = await runWorkerOnce({ limit: 10 });
  return jsonOk({ ok: true, ...result });
}

