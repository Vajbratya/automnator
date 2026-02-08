import { redirect } from "next/navigation";

import { getServerUser } from "@/lib/auth/server-user";
import { SignInForm } from "@/app/sign-in/sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const u = await getServerUser();
  if (u) redirect("/app");

  return (
    <div className="min-h-screen bg-[radial-gradient(90rem_60rem_at_10%_0%,rgba(10,102,194,0.18),transparent),radial-gradient(90rem_60rem_at_90%_10%,rgba(0,0,0,0.10),transparent)] px-6 py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0A66C2] text-white">
              <span className="text-lg font-semibold">a</span>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">automnator</div>
              <div className="text-xs text-black/60">Mock sign-in (email only)</div>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-black/70">
            This environment uses a local session cookie. Enter any email to
            continue.
          </p>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
