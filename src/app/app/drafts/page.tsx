import Link from "next/link";

import { requireServerUser } from "@/lib/auth/server-user";
import { getStore } from "@/lib/store";
import { NewDraftButton } from "@/app/app/drafts/new-draft-button";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const u = await requireServerUser("/app/drafts");
  const store = getStore();
  const drafts = await store.listDrafts(u.id);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">
            Drafts
          </h1>
          <p className="mt-1 text-sm text-black/60">
            Create, generate variants, and schedule posts.
          </p>
        </div>
        <NewDraftButton />
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white">
        <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-black/10 px-5 py-3 text-xs font-semibold text-black/60">
          <div>Draft</div>
          <div>Status</div>
        </div>
        <div className="divide-y divide-black/10">
          {drafts.length === 0 ? (
            <div className="px-5 py-10 text-sm text-black/60">
              No drafts yet. Create one to get started.
            </div>
          ) : (
            drafts.map((d) => (
              <Link
                key={d.id}
                href={`/app/drafts/${d.id}`}
                className="grid grid-cols-[1fr_auto] gap-3 px-5 py-4 hover:bg-black/[0.02]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-black">
                    {d.title}
                  </div>
                  <div className="mt-1 truncate text-xs text-black/60">
                    Updated {new Date(d.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="self-center">
                  <span className="rounded-full border border-black/10 bg-black/[0.03] px-2 py-1 text-xs font-semibold text-black/70">
                    {d.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
