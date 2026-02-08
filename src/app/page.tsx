import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionCookieName, parseSessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const session = token ? parseSessionToken(token) : null;
  if (session) redirect("/app");

  return (
    <div className="min-h-screen bg-[radial-gradient(80rem_60rem_at_20%_0%,rgba(10,102,194,0.15),transparent),radial-gradient(80rem_60rem_at_80%_10%,rgba(0,0,0,0.10),transparent)]">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0A66C2] text-white">
            <span className="text-lg font-semibold">a</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">automnator</div>
            <div className="text-xs text-black/60">
              AI drafts, scheduling, approvals, worker publishing
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 pb-24 pt-8">
        <section className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-6">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-black md:text-5xl">
              Draft better LinkedIn posts.
              <br />
              Schedule them.
              <br />
              Publish with a worker.
            </h1>
            <p className="max-w-prose text-pretty text-base leading-7 text-black/70">
              Automnator gives you an AI drafting workflow with a quick heuristic
              “virality” score, an approval queue, and a background worker that
              publishes due posts. Runs locally with a file-backed DB and mock
              LinkedIn by default.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#0A66C2] px-6 text-sm font-semibold text-white hover:bg-[#0858a8]"
              >
                Start drafting
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center justify-center rounded-full border border-black/15 bg-white px-6 text-sm font-semibold text-black hover:bg-black/5"
              >
                View dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
            <div className="grid gap-4">
              <div className="rounded-2xl bg-black/[0.03] p-4">
                <div className="text-xs font-semibold text-black/60">
                  Workflow
                </div>
                <div className="mt-2 grid gap-2 text-sm text-black/80">
                  <div>1. Create a draft</div>
                  <div>2. Generate variants + score</div>
                  <div>3. Schedule + approve</div>
                  <div>4. Worker publishes</div>
                </div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="text-xs font-semibold text-black/60">
                  Mock-first
                </div>
                <div className="mt-2 text-sm text-black/80">
                  Safe default: no scraping, no credentials. Swap in a real
                  adapter only if your integration is compliant.
                </div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="text-xs font-semibold text-black/60">
                  Background worker
                </div>
                <div className="mt-2 font-mono text-xs text-black/70">
                  pnpm worker
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 pb-10 text-xs text-black/50">
        Built for local-first iteration. Store lives in <code>.data/</code>.
      </footer>
    </div>
  );
}
