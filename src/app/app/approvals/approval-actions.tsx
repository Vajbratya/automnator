"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { csrfFetchJson } from "@/lib/browser/csrf-fetch";

type ApproveResponse = { schedule: { id: string } };

export function ApprovalActions({ scheduleId }: { scheduleId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "approve" | "reject") {
    setIsLoading(true);
    setError(null);
    try {
      await csrfFetchJson<ApproveResponse>(`/api/approvals/${scheduleId}/${action}`, {
        method: "POST",
      });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => act("reject")}
          disabled={isLoading}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => act("approve")}
          disabled={isLoading}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-black px-3 text-xs font-semibold text-white hover:bg-black/90 disabled:opacity-50"
        >
          Approve
        </button>
      </div>
      {error ? (
        <div className="max-w-[18rem] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
          {error}
        </div>
      ) : null}
    </div>
  );
}

