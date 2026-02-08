"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { csrfFetchJson } from "@/lib/browser/csrf-fetch";

type CreateDraftResponse = {
  draft: { id: string; title: string; content: string; language: "en" | "pt-BR" };
};

export function NewDraftButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function onClick() {
    setIsLoading(true);
    try {
      const data = await csrfFetchJson<CreateDraftResponse>("/api/drafts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Untitled draft", content: "", language: "en" }),
      });
      router.push(`/app/drafts/${data.draft.id}`);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0A66C2] px-4 text-sm font-semibold text-white hover:bg-[#0858a8] disabled:opacity-50"
    >
      {isLoading ? "Creating..." : "New draft"}
    </button>
  );
}

