import Link from "next/link";

import { requireServerUser } from "@/lib/auth/server-user";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const u = await requireServerUser("/app/schedules");
  const store = getStore();

  const [drafts, schedules] = await Promise.all([
    store.listDrafts(u.id),
    store.listSchedules(u.id),
  ]);
  const draftTitleById = new Map(drafts.map((d) => [d.id, d.title]));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black">
          Schedules
        </h1>
        <p className="mt-1 text-sm text-black/60">
          Approved schedules are picked up by the worker when due.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white">
        <div className="grid grid-cols-[12rem_1fr_7rem_7rem] gap-3 border-b border-black/10 px-5 py-3 text-xs font-semibold text-black/60">
          <div>Run at</div>
          <div>Draft</div>
          <div>Approval</div>
          <div>Status</div>
        </div>
        <div className="divide-y divide-black/10">
          {schedules.length === 0 ? (
            <div className="px-5 py-10 text-sm text-black/60">
              No schedules yet.
            </div>
          ) : (
            schedules.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[12rem_1fr_7rem_7rem] gap-3 px-5 py-4"
              >
                <div className="text-sm text-black/80">
                  {new Date(s.runAt).toLocaleString()}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/app/drafts/${s.draftId}`}
                    className="truncate text-sm font-semibold text-black hover:underline"
                  >
                    {draftTitleById.get(s.draftId) ?? s.draftId}
                  </Link>
                  {s.lastError ? (
                    <div className="mt-1 truncate text-xs text-red-700">
                      {s.lastError}
                    </div>
                  ) : null}
                </div>
                <div className="self-start">
                  <span className="rounded-full border border-black/10 bg-black/[0.03] px-2 py-1 text-xs font-semibold text-black/70">
                    {s.approvalState}
                  </span>
                </div>
                <div className="self-start">
                  <span className="rounded-full border border-black/10 bg-black/[0.03] px-2 py-1 text-xs font-semibold text-black/70">
                    {s.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
