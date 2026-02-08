import Link from "next/link";

import { requireServerUser } from "@/lib/auth/server-user";
import { getStore } from "@/lib/store";
import { ApprovalActions } from "@/app/app/approvals/approval-actions";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const u = await requireServerUser("/app/approvals");
  const store = getStore();

  const [drafts, schedules] = await Promise.all([
    store.listDrafts(u.id),
    store.listSchedules(u.id),
  ]);
  const draftTitleById = new Map(drafts.map((d) => [d.id, d.title]));

  const pending = schedules.filter(
    (s) => s.status === "queued" && s.approvalState === "pending"
  );

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black">
          Approvals
        </h1>
        <p className="mt-1 text-sm text-black/60">
          Human-in-the-loop: approve schedules before the worker can publish.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white">
        <div className="grid grid-cols-[12rem_1fr_12rem] gap-3 border-b border-black/10 px-5 py-3 text-xs font-semibold text-black/60">
          <div>Run at</div>
          <div>Draft</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-black/10">
          {pending.length === 0 ? (
            <div className="px-5 py-10 text-sm text-black/60">
              No pending approvals.
            </div>
          ) : (
            pending.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[12rem_1fr_12rem] gap-3 px-5 py-4"
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
                  <div className="mt-1 text-xs text-black/60">
                    Timezone: {s.timezone}
                  </div>
                </div>
                <ApprovalActions scheduleId={s.id} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
