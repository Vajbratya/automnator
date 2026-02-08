"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function onClick() {
    setIsLoading(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-black hover:bg-black/5 disabled:opacity-50"
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}

