import { notFound } from "next/navigation";

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
  if (!draft) notFound();

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
