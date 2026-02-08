"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SignInResponse =
  | { ok: true; user: { id: string; email: string } }
  | { error: string };

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => {
    const n = searchParams.get("next");
    return n && n.startsWith("/") ? n : "/app";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as SignInResponse;
      if (!res.ok) throw new Error("error" in data ? data.error : "Sign-in failed.");
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-2">
        <span className="text-xs font-semibold text-black/60">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
          placeholder="you@company.com"
          autoComplete="email"
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-4 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50"
      >
        {isLoading ? "Signing in..." : "Continue"}
      </button>

      <div className="text-xs leading-5 text-black/60">
        Tip: run the worker in another terminal with <code>pnpm worker</code>.
      </div>
    </form>
  );
}

