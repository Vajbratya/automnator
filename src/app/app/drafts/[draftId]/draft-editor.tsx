"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { csrfFetchJson } from "@/lib/browser/csrf-fetch";

type Draft = {
  id: string;
  title: string;
  content: string;
  language: "en" | "pt-BR";
  status: "draft" | "scheduled" | "published";
  updatedAt: string;
};

type PatchDraftResponse = { draft: Draft };
type DeleteDraftResponse = { ok: true };

type ScoreResponse = {
  score: { score: number; reasons: string[] };
};

type GenerateResponse = {
  variants: Array<{
    hook: string;
    body: string;
    cta: string;
    fullText: string;
    score: { score: number; reasons: string[] };
  }>;
};

type CreateScheduleResponse = {
  schedule: {
    id: string;
    draftId: string;
    runAt: string;
    timezone: string;
    approvalState: "pending" | "approved" | "rejected";
    status: "queued" | "running" | "succeeded" | "failed" | "canceled";
  };
};

function formatScore(score: ScoreResponse["score"] | null): string {
  if (!score) return "—";
  return `${score.score}/100`;
}

export function DraftEditor({ draft }: { draft: Draft }) {
  const router = useRouter();

  const [title, setTitle] = useState(draft.title);
  const [language, setLanguage] = useState<Draft["language"]>(draft.language);
  const [content, setContent] = useState(draft.content);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(draft.updatedAt);

  const [score, setScore] = useState<ScoreResponse["score"] | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("");
  const [audience, setAudience] = useState("");
  const [variantCount, setVariantCount] = useState(3);
  const [variants, setVariants] = useState<GenerateResponse["variants"]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [runAtLocal, setRunAtLocal] = useState("");
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  async function saveDraft() {
    setIsSaving(true);
    setSaveError(null);
    try {
      const data = await csrfFetchJson<PatchDraftResponse>(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content, language }),
      });
      setLastSavedAt(data.draft.updatedAt);
      router.refresh();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteDraft() {
    const ok = window.confirm("Delete this draft? This cannot be undone.");
    if (!ok) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await csrfFetchJson<DeleteDraftResponse>(`/api/drafts/${draft.id}`, {
        method: "DELETE",
      });
      router.push("/app/drafts");
      router.refresh();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function scoreNow() {
    setIsScoring(true);
    try {
      const res = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: content }),
      });
      const data = (await res.json()) as ScoreResponse | { error: string };
      if (!res.ok) throw new Error("error" in data ? data.error : "Scoring failed.");
      setScore((data as ScoreResponse).score);
    } finally {
      setIsScoring(false);
    }
  }

  async function generateVariants() {
    setIsGenerating(true);
    setVariants([]);
    try {
      const res = await fetch("/api/ai/generate-post", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic,
          language,
          tone: tone.trim() ? tone : undefined,
          audience: audience.trim() ? audience : undefined,
          variantCount,
        }),
      });
      const data = (await res.json()) as GenerateResponse | { error: string };
      if (!res.ok) throw new Error("error" in data ? data.error : "Generation failed.");
      setVariants((data as GenerateResponse).variants);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function applyVariant(text: string) {
    setContent(text);
    setScore(null);
  }

  async function createSchedule() {
    setIsScheduling(true);
    setScheduleMsg(null);
    try {
      if (!runAtLocal) throw new Error("Pick a date/time.");
      const runAtIso = new Date(runAtLocal).toISOString();

      const data = await csrfFetchJson<CreateScheduleResponse>("/api/schedules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, runAt: runAtIso, timezone }),
      });

      setScheduleMsg(
        `Scheduled for ${new Date(data.schedule.runAt).toLocaleString()} (${data.schedule.timezone}). Pending approval.`
      );
      router.refresh();
    } catch (err) {
      setScheduleMsg((err as Error).message);
    } finally {
      setIsScheduling(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
              placeholder="Post title"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Draft["language"])}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
            >
              <option value="en">English</option>
              <option value="pt-BR">Portuguese (Brazil)</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[14rem] resize-y rounded-2xl border border-black/10 bg-white p-3 text-sm leading-6 outline-none ring-[#0A66C2]/30 focus:ring-4"
              placeholder="Write your post..."
            />
          </div>

          {saveError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {saveError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-black/60">
              Last saved:{" "}
              {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : "—"}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={deleteDraft}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-black/60">Score</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-black">
              {formatScore(score)}
            </div>
          </div>
          <button
            type="button"
            onClick={scoreNow}
            disabled={isScoring || !content.trim()}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-black hover:bg-black/5 disabled:opacity-50"
          >
            {isScoring ? "Scoring..." : "Score now"}
          </button>
        </div>
        {score?.reasons?.length ? (
          <ul className="mt-4 grid gap-2 text-sm text-black/70">
            {score.reasons.map((r) => (
              <li key={r} className="rounded-2xl bg-black/[0.03] px-3 py-2">
                {r}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="text-xs font-semibold text-black/60">AI variants</div>
        <div className="mt-2 grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-black/60">Topic</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
                placeholder="e.g. Lessons from shipping fast"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-black/60">Tone</span>
              <input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
                placeholder="e.g. direct, opinionated, friendly"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-black/60">Audience</span>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
                placeholder="e.g. founders, engineers, recruiters"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold text-black/60">Variants</span>
              <select
                value={variantCount}
                onChange={(e) => setVariantCount(Number(e.target.value))}
                className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-black/60">
              Generates mock AI text unless you wire in a real provider.
            </div>
            <button
              type="button"
              onClick={generateVariants}
              disabled={isGenerating || !topic.trim()}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0A66C2] px-4 text-sm font-semibold text-white hover:bg-[#0858a8] disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>

          {variants.length ? (
            <div className="grid gap-3">
              {variants.map((v, idx) => (
                <div
                  key={`${idx}-${v.hook}`}
                  className="rounded-3xl border border-black/10 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-black">
                      Variant {idx + 1}{" "}
                      <span className="ml-2 rounded-full border border-black/10 bg-black/[0.03] px-2 py-1 text-xs font-semibold text-black/70">
                        {v.score.score}/100
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyVariant(v.fullText)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-black hover:bg-black/5"
                    >
                      Use this
                    </button>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-black/80">
                    {v.fullText}
                  </div>
                  {v.score.reasons?.length ? (
                    <div className="mt-3 grid gap-2">
                      {v.score.reasons.map((r) => (
                        <div
                          key={r}
                          className="rounded-2xl bg-black/[0.03] px-3 py-2 text-xs text-black/70"
                        >
                          {r}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="text-xs font-semibold text-black/60">Scheduling</div>
        <div className="mt-2 grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">
              Run at (local time)
            </label>
            <input
              type="datetime-local"
              value={runAtLocal}
              onChange={(e) => setRunAtLocal(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
            />
            <div className="text-xs text-black/60">Timezone: {timezone}</div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-black/60">
              Schedules start as <span className="font-semibold">pending</span>{" "}
              and must be approved.
            </div>
            <button
              type="button"
              onClick={createSchedule}
              disabled={isScheduling}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50"
            >
              {isScheduling ? "Scheduling..." : "Schedule"}
            </button>
          </div>

          {scheduleMsg ? (
            <div className="rounded-2xl border border-black/10 bg-black/[0.03] px-3 py-2 text-sm text-black/80">
              {scheduleMsg}{" "}
              <a
                href="/app/approvals"
                className="font-semibold text-[#0A66C2]"
              >
                Go to approvals
              </a>
              .
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

