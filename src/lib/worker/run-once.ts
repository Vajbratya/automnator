import { getLinkedInClient } from "@/lib/linkedin";
import { getStore } from "@/lib/store";
import { nowIso } from "@/lib/time";

export type WorkerRunResult = {
  claimed: number;
  succeeded: number;
  failed: number;
  errors: string[];
};

export async function runWorkerOnce(options?: { limit?: number }): Promise<WorkerRunResult> {
  const store = getStore();
  const claimed = await store.claimDueSchedules(nowIso(), options?.limit ?? 10);
  if (claimed.length === 0) return { claimed: 0, succeeded: 0, failed: 0, errors: [] };

  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const schedule of claimed) {
    const executedAt = nowIso();
    try {
      const user = await store.getUserById(schedule.userId);
      if (!user) throw new Error("User not found for schedule.");

      const draft = await store.getDraft(schedule.userId, schedule.draftId);
      if (!draft) throw new Error("Draft not found for schedule.");
      if (!draft.content.trim()) throw new Error("Draft content is empty.");

      const li = getLinkedInClient(user.email);
      const res = await li.createPost({ text: draft.content });

      await store.markScheduleSucceeded(schedule.id, {
        executedAt,
        providerPostId: res.postId,
        url: res.url,
      });
      succeeded += 1;
    } catch (err) {
      const msg = (err as Error).message;
      errors.push(`${schedule.id}: ${msg}`);
      await store.markScheduleFailed(schedule.id, {
        executedAt,
        error: msg,
      });
      failed += 1;
    }
  }

  return { claimed: claimed.length, succeeded, failed, errors };
}

