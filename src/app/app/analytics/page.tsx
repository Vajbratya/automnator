import Link from "next/link";

import { requireServerUser } from "@/lib/auth/server-user";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const u = await requireServerUser("/app/analytics");
  const store = getStore();

  const [posts, logs] = await Promise.all([
    store.listPosts(u.id),
    store.listActionLogs(u.id),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-black">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-black/60">
          Local execution logs and published post references (mock mode by
          default).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-black/10 bg-white p-6">
          <div className="text-xs font-semibold text-black/60">Published</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-black">
            {posts.length}
          </div>
          <div className="mt-1 text-sm text-black/60">Total posts recorded.</div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white p-6">
          <div className="text-xs font-semibold text-black/60">Events</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-black">
            {logs.length}
          </div>
          <div className="mt-1 text-sm text-black/60">Total worker events.</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white">
          <div className="border-b border-black/10 px-5 py-3 text-xs font-semibold text-black/60">
            Recent posts
          </div>
          <div className="divide-y divide-black/10">
            {posts.slice(0, 10).length === 0 ? (
              <div className="px-5 py-10 text-sm text-black/60">
                No posts yet.
              </div>
            ) : (
              posts.slice(0, 10).map((p) => (
                <div key={p.id} className="px-5 py-4">
                  <div className="text-sm font-semibold text-black">
                    {new Date(p.publishedAt).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-black/60">
                    Provider ID: <span className="font-mono">{p.providerPostId}</span>
                  </div>
                  {p.url ? (
                    <div className="mt-2">
                      <Link
                        href={p.url}
                        className="text-xs font-semibold text-[#0A66C2] hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open post
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white">
          <div className="border-b border-black/10 px-5 py-3 text-xs font-semibold text-black/60">
            Recent events
          </div>
          <div className="divide-y divide-black/10">
            {logs.slice(0, 10).length === 0 ? (
              <div className="px-5 py-10 text-sm text-black/60">
                No events yet.
              </div>
            ) : (
              logs.slice(0, 10).map((l) => (
                <div key={l.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-black">
                      {l.type}
                    </div>
                    <span className="rounded-full border border-black/10 bg-black/[0.03] px-2 py-1 text-xs font-semibold text-black/70">
                      {l.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-black/60">
                    {new Date(l.createdAt).toLocaleString()}
                  </div>
                  {l.message ? (
                    <div className="mt-2 text-sm text-black/70">{l.message}</div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
