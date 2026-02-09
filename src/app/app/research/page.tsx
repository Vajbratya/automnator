import { requireServerUser } from "@/lib/auth/server-user";
import { getStore } from "@/lib/store";

import { ResearchClient } from "@/app/app/research/research-client";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  const u = await requireServerUser("/app/research");
  const store = getStore();

  const [sources, captures] = await Promise.all([
    store.listSources(u.id),
    store.listCaptures(u.id),
  ]);

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="text-xs font-semibold text-black/60">Research</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black">
          Inspiration inbox
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-6 text-black/70">
          Paste posts you liked (or competitors you follow). The planner uses
          these patterns to suggest what to post next.
        </p>
      </div>

      <ResearchClient sources={sources} captures={captures} />
    </div>
  );
}

