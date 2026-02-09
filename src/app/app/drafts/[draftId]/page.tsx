import Link from "next/link";

import { requireServerUser } from "@/lib/auth/server-user";
import { getStore } from "@/lib/store";
import { DraftEditor } from "@/app/app/drafts/[draftId]/draft-editor";

export const dynamic = "force-dynamic";

export default async function DraftDetailPage({
  params,
}: {
  params: { draftId: string };
}) {
  const u = await requireServerUser("/app/drafts");
  const { draftId } = params;

  const store = getStore();
  const draft = await store.getDraft(u.id, draftId);
  if (!draft) {
    return (
      <div className="grid gap-6">
        <div className="rounded-3xl border border-black/10 bg-white p-6">
          <div className="text-xs font-semibold text-black/60">Draft</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black">
            Draft not found
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-black/70">
            This draft ID does not exist for your account, or the demo storage was
            reset on the deploy.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app/drafts"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0A66C2] px-4 text-sm font-semibold text-white hover:brightness-95"
            >
              Back to drafts
            </Link>
            <div className="inline-flex h-10 items-center rounded-xl border border-black/10 bg-white px-4 font-mono text-xs text-black/60">
              {draftId}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <div className="text-xs font-semibold text-black/60">Draft</div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-black">
          {draft.title}
        </h1>
        <div className="mt-2 text-sm text-black/60">
          Status:{" "}
          <span className="rounded-full border border-black/10 bg-black/[0.03] px-2 py-1 text-xs font-semibold text-black/70">
            {draft.status}
          </span>
        </div>
      </div>

      <DraftEditor
        draft={{
          id: draft.id,
          title: draft.title,
          content: draft.content,
          language: draft.language,
          status: draft.status,
          updatedAt: draft.updatedAt,
        }}
      />
    </div>
  );
}
