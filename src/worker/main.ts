import { nowIso } from "@/lib/time";
import { runWorkerOnce } from "@/lib/worker/run-once";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runOnce(): Promise<void> {
  await runWorkerOnce({ limit: 10 });
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
