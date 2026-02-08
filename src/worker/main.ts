import { getStore } from "@/lib/store";
import { getLinkedInClient } from "@/lib/linkedin";
import { nowIso } from "@/lib/time";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnce(): Promise<void> {
  const store = getStore();
  const claimed = await store.claimDueSchedules(nowIso(), 10);
  if (claimed.length === 0) return;

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
    } catch (err) {
      await store.markScheduleFailed(schedule.id, {
        executedAt,
        error: (err as Error).message,
      });
    }
  }
}

async function main(): Promise<void> {
  console.log(`[worker] started at ${nowIso()}`);

  let shouldExit = false;
  const onExit = () => {
    shouldExit = true;
  };
  process.on("SIGINT", onExit);
  process.on("SIGTERM", onExit);

  while (!shouldExit) {
    await runOnce();
    await sleep(5_000);
  }

  console.log(`[worker] stopped at ${nowIso()}`);
}

main().catch((err) => {
  console.error("[worker] fatal error", err);
  process.exitCode = 1;
});
