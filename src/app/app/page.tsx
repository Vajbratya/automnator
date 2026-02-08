import Link from "next/link";

import { requireServerUser } from "@/lib/auth/server-user";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const u = await requireServerUser("/app");
  const store = getStore();

  const [drafts, schedules] = await Promise.all([
    store.listDrafts(u.id),
    store.listSchedules(u.id),
  ]);

  const pendingApprovals = schedules.filter(
    (s) => s.status === "queued" && s.approvalState === "pending"
  );
  const queuedApproved = schedules.filter(
    (s) => s.status === "queued" && s.approvalState === "approved"
  );

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="text-xs font-semibold text-black/60">Welcome</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black">
          Your automations at a glance
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-6 text-black/70">
          Draft content, score variants, schedule posts, approve them, and run the
          worker to publish.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/app/drafts"
          className="rounded-3xl border border-black/10 bg-white p-6 hover:bg-black/[0.02]"
        >
          <div className="text-xs font-semibold text-black/60">Drafts</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-black">
            {drafts.length}
          </div>
          <div className="mt-1 text-sm text-black/60">
            Create and edit posts.
          </div>
        </Link>

        <Link
          href="/app/approvals"
          className="rounded-3xl border border-black/10 bg-white p-6 hover:bg-black/[0.02]"
        >
          <div className="text-xs font-semibold text-black/60">Approvals</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-black">
            {pendingApprovals.length}
          </div>
          <div className="mt-1 text-sm text-black/60">
            Pending review and approval.
          </div>
        </Link>

        <Link
          href="/app/schedules"
          className="rounded-3xl border border-black/10 bg-white p-6 hover:bg-black/[0.02]"
        >
          <div className="text-xs font-semibold text-black/60">Queued</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-black">
            {queuedApproved.length}
          </div>
          <div className="mt-1 text-sm text-black/60">
            Approved, waiting for run time.
          </div>
        </Link>
      </div>

      <div className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="text-xs font-semibold text-black/60">Worker</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-black/70">
            Run the background publisher in another terminal:
          </div>
          <code className="rounded-xl bg-black/[0.03] px-3 py-2 font-mono text-xs text-black/70">
            pnpm worker
          </code>
        </div>
      </div>
    </div>
  );
}
