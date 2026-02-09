"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { csrfFetchJson } from "@/lib/browser/csrf-fetch";

type Scored = { score: number; reasons: string[] };

type PlannedPost = {
  title: string;
  angle?: string;
  hook: string;
  body: string;
  cta: string;
  fullText: string;
  score: Scored;
};

type GeneratePlanResponse = { posts: PlannedPost[] };

type CreateDraftResponse = {
  draft: { id: string; title: string; content: string; language: "en" | "pt-BR" };
};

type CreateScheduleResponse = {
  schedule: { id: string; draftId: string; runAt: string; timezone: string };
};

function nextBusinessDayAt(hour: number, minute: number, offset: number): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(hour, minute, 0, 0);

  // If time already passed today, start from tomorrow.
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);

  let added = 0;
  while (added < offset) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay(); // 0 Sun ... 6 Sat
    if (day !== 0 && day !== 6) added += 1;
  }

  // Ensure the target day is a weekday.
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);

  return d;
}

export function PlannerClient() {
  const router = useRouter();

  const [language, setLanguage] = useState<"en" | "pt-BR">("pt-BR");
  const [niche, setNiche] = useState("");
  const [tone, setTone] = useState("Direto, prático, sem enrolação");
  const [goal, setGoal] = useState("Gerar comentários e leads qualificados");
  const [postCount, setPostCount] = useState(5);
  const [posts, setPosts] = useState<PlannedPost[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scheduleHour, setScheduleHour] = useState(9);
  const [scheduleMinute, setScheduleMinute] = useState(0);
  const [autoApprove, setAutoApprove] = useState(true);
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  async function generate() {
    setIsGenerating(true);
    setError(null);
    setScheduleMsg(null);
    setPosts([]);
    try {
      const data = await csrfFetchJson<GeneratePlanResponse>("/api/plans/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language,
          niche,
          tone: tone.trim() ? tone : undefined,
          goal: goal.trim() ? goal : undefined,
          postCount,
        }),
      });
      setPosts(data.posts);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function approveSchedule(scheduleId: string) {
    await csrfFetchJson<{ schedule: unknown }>(`/api/approvals/${scheduleId}/approve`, {
      method: "POST",
    });
  }

  async function scheduleOne(p: PlannedPost, idx: number) {
    const draftData = await csrfFetchJson<CreateDraftResponse>("/api/drafts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: p.title,
        content: p.fullText,
        language,
      }),
    });

    const runAt = nextBusinessDayAt(scheduleHour, scheduleMinute, idx).toISOString();
    const scheduleData = await csrfFetchJson<CreateScheduleResponse>("/api/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draftId: draftData.draft.id,
        runAt,
        timezone,
      }),
    });

    if (autoApprove) {
      await approveSchedule(scheduleData.schedule.id);
    }

    return scheduleData.schedule;
  }

  async function scheduleAll() {
    setIsScheduling(true);
    setError(null);
    setScheduleMsg(null);
    try {
      if (posts.length === 0) throw new Error("Generate posts first.");
      const created: Array<{ id: string; runAt: string }> = [];

      for (let i = 0; i < posts.length; i += 1) {
        const s = await scheduleOne(posts[i]!, i);
        created.push({ id: s.id, runAt: s.runAt });
      }

      setScheduleMsg(
        `Created ${created.length} schedules (${autoApprove ? "approved" : "pending"}).`
      );
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsScheduling(false);
    }
  }

  return (
    <div className="grid gap-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}
      {scheduleMsg ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {scheduleMsg}
        </div>
      ) : null}

      <section className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "pt-BR")}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
            >
              <option value="pt-BR">Portuguese (Brazil)</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Posts</label>
            <input
              type="number"
              min={1}
              max={10}
              value={postCount}
              onChange={(e) => setPostCount(Number(e.target.value))}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
            />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <label className="text-xs font-semibold text-black/60">Niche</label>
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
              placeholder="Ex: radiologia, SaaS B2B, marketing para clínicas, etc."
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Tone (optional)</label>
            <input
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Goal (optional)</label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={generate}
            disabled={isGenerating || !niche.trim()}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0A66C2] px-4 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            {isGenerating ? "Generating…" : "Generate posts"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-black/60">Auto-schedule</div>
            <div className="mt-1 text-sm text-black/70">
              Timezone: <span className="font-mono text-xs">{timezone}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-black/70">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
              />
              Auto-approve
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Hour</label>
            <input
              type="number"
              min={0}
              max={23}
              value={scheduleHour}
              onChange={(e) => setScheduleHour(Number(e.target.value))}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Minute</label>
            <input
              type="number"
              min={0}
              max={59}
              value={scheduleMinute}
              onChange={(e) => setScheduleMinute(Number(e.target.value))}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
            />
          </div>
          <div className="flex items-end justify-end">
            <button
              type="button"
              onClick={scheduleAll}
              disabled={isScheduling || posts.length === 0}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-4 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
            >
              {isScheduling ? "Scheduling…" : "Schedule all"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        {posts.length === 0 ? (
          <div className="rounded-3xl border border-black/10 bg-white p-6 text-sm text-black/70">
            Generate a plan to see posts here.
          </div>
        ) : (
          posts.map((p, idx) => (
            <article
              key={`${p.title}-${idx}`}
              className="rounded-3xl border border-black/10 bg-white p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-black/60">
                    Score: {p.score.score}/100
                  </div>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-black">
                    {p.title}
                  </h2>
                  {p.angle ? (
                    <div className="mt-1 text-sm text-black/60">{p.angle}</div>
                  ) : null}
                </div>
                <div className="text-xs text-black/60">
                  Suggested:{" "}
                  {nextBusinessDayAt(scheduleHour, scheduleMinute, idx).toLocaleString()}
                </div>
              </div>

              <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-black/10 bg-black/[0.02] p-4 font-mono text-xs leading-5 text-black/80">
                {p.fullText}
              </div>

              <div className="mt-3 text-xs text-black/60">
                {p.score.reasons.join(" · ")}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}

