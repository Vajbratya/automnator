import { requireServerUser } from "@/lib/auth/server-user";

import { PlannerClient } from "@/app/app/planner/planner-client";

export const dynamic = "force-dynamic";

export default async function PlannerPage() {
  await requireServerUser("/app/planner");

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="text-xs font-semibold text-black/60">Planner</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black">
          What should I post next?
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-6 text-black/70">
          Generate a batch of posts based on your niche and captured inspiration,
          then auto-schedule them. The worker publishes at run time.
        </p>
      </div>

      <PlannerClient />
    </div>
  );
}

