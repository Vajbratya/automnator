import Link from "next/link";

import { requireServerUser } from "@/lib/auth/server-user";
import { SignOutButton } from "@/app/app/sign-out-button";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const u = await requireServerUser("/app");

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/app" className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A66C2] text-white">
                <span className="text-base font-semibold">a</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight">
                  automnator
                </div>
                <div className="text-xs text-black/60">Dashboard</div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-xs text-black/60 sm:block">{u.email}</div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-6 md:grid-cols-[14rem_1fr]">
        <aside className="rounded-2xl border border-black/10 bg-white p-4">
          <nav className="grid gap-1 text-sm">
            <Link
              href="/app/drafts"
              className="rounded-xl px-3 py-2 hover:bg-black/5"
            >
              Drafts
            </Link>
            <Link
              href="/app/research"
              className="rounded-xl px-3 py-2 hover:bg-black/5"
            >
              Research
            </Link>
            <Link
              href="/app/planner"
              className="rounded-xl px-3 py-2 hover:bg-black/5"
            >
              Planner
            </Link>
            <Link
              href="/app/schedules"
              className="rounded-xl px-3 py-2 hover:bg-black/5"
            >
              Schedules
            </Link>
            <Link
              href="/app/approvals"
              className="rounded-xl px-3 py-2 hover:bg-black/5"
            >
              Approvals
            </Link>
            <Link
              href="/app/analytics"
              className="rounded-xl px-3 py-2 hover:bg-black/5"
            >
              Analytics
            </Link>
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
