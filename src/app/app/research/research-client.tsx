"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { csrfFetchJson } from "@/lib/browser/csrf-fetch";

type Source = {
  id: string;
  type: "person" | "keyword";
  name: string;
  profileUrl?: string;
  keyword?: string;
  updatedAt: string;
};

type Capture = {
  id: string;
  sourceId?: string;
  authorName: string;
  authorUrl?: string;
  postUrl?: string;
  text: string;
  capturedAt: string;
};

type CreateSourceResponse = { source: Source };
type CreateCaptureResponse = { capture: Capture };

export function ResearchClient({
  sources,
  captures,
}: {
  sources: Source[];
  captures: Capture[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [sourceType, setSourceType] = useState<Source["type"]>("person");
  const [sourceName, setSourceName] = useState("");
  const [sourceProfileUrl, setSourceProfileUrl] = useState("");
  const [sourceKeyword, setSourceKeyword] = useState("");
  const [isCreatingSource, setIsCreatingSource] = useState(false);

  const [captureSourceId, setCaptureSourceId] = useState<string>("");
  const [captureAuthor, setCaptureAuthor] = useState("");
  const [capturePostUrl, setCapturePostUrl] = useState("");
  const [captureText, setCaptureText] = useState("");
  const [isCreatingCapture, setIsCreatingCapture] = useState(false);

  const sourcesById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);

  async function createSource() {
    setIsCreatingSource(true);
    setError(null);
    try {
      await csrfFetchJson<CreateSourceResponse>("/api/research/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: sourceType,
          name: sourceName,
          profileUrl: sourceProfileUrl.trim() ? sourceProfileUrl : undefined,
          keyword: sourceKeyword.trim() ? sourceKeyword : undefined,
        }),
      });
      setSourceName("");
      setSourceProfileUrl("");
      setSourceKeyword("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsCreatingSource(false);
    }
  }

  async function deleteSource(id: string) {
    const ok = window.confirm("Delete this source? Captures will be kept.");
    if (!ok) return;
    setError(null);
    try {
      await csrfFetchJson<{ ok: true }>(`/api/research/sources/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function createCapture() {
    setIsCreatingCapture(true);
    setError(null);
    try {
      await csrfFetchJson<CreateCaptureResponse>("/api/research/captures", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceId: captureSourceId || undefined,
          authorName: captureAuthor,
          postUrl: capturePostUrl.trim() ? capturePostUrl : undefined,
          text: captureText,
          capturedAt: new Date().toISOString(),
        }),
      });
      setCaptureAuthor("");
      setCapturePostUrl("");
      setCaptureText("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsCreatingCapture(false);
    }
  }

  async function deleteCapture(id: string) {
    const ok = window.confirm("Delete this capture?");
    if (!ok) return;
    setError(null);
    try {
      await csrfFetchJson<{ ok: true }>(`/api/research/captures/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="grid gap-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      ) : null}

      <section className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-black/60">Sources</div>
            <div className="mt-1 text-sm text-black/70">
              Add people you follow or keywords you care about.
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Type</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as Source["type"])}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
            >
              <option value="person">Person</option>
              <option value="keyword">Keyword</option>
            </select>
          </div>

          <div className="grid gap-2 md:col-span-2">
            <label className="text-xs font-semibold text-black/60">Name</label>
            <input
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
              placeholder="e.g. Andrew Chen / SaaS growth"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">
              {sourceType === "person" ? "Profile URL (optional)" : "Keyword (optional)"}
            </label>
            {sourceType === "person" ? (
              <input
                value={sourceProfileUrl}
                onChange={(e) => setSourceProfileUrl(e.target.value)}
                className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
                placeholder="https://www.linkedin.com/in/…"
              />
            ) : (
              <input
                value={sourceKeyword}
                onChange={(e) => setSourceKeyword(e.target.value)}
                className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
                placeholder="e.g. radiology AI"
              />
            )}
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={createSource}
            disabled={isCreatingSource || !sourceName.trim()}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0A66C2] px-4 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            Add source
          </button>
        </div>

        <div className="mt-6 grid gap-2">
          {sources.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/70">
              No sources yet.
            </div>
          ) : (
            sources.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-black">
                    {s.name}{" "}
                    <span className="text-xs font-semibold text-black/50">
                      ({s.type})
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-black/60">
                    {s.profileUrl ? s.profileUrl : s.keyword ? `keyword: ${s.keyword}` : "—"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteSource(s.id)}
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-black/70 hover:bg-black/[0.03]"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white p-6">
        <div className="text-xs font-semibold text-black/60">Captured posts</div>
        <div className="mt-1 text-sm text-black/70">
          Paste the post text. The planner uses this for pattern mining.
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Source (optional)</label>
            <select
              value={captureSourceId}
              onChange={(e) => setCaptureSourceId(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
            >
              <option value="">—</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Author name</label>
            <input
              value={captureAuthor}
              onChange={(e) => setCaptureAuthor(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
              placeholder="e.g. Jane Doe"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-semibold text-black/60">Post URL (optional)</label>
            <input
              value={capturePostUrl}
              onChange={(e) => setCapturePostUrl(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none ring-[#0A66C2]/30 focus:ring-4"
              placeholder="https://www.linkedin.com/…"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <label className="text-xs font-semibold text-black/60">Post text</label>
          <textarea
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            className="min-h-[10rem] resize-y rounded-2xl border border-black/10 bg-white p-3 text-sm leading-6 outline-none ring-[#0A66C2]/30 focus:ring-4"
            placeholder="Paste the post content here…"
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={createCapture}
            disabled={isCreatingCapture || !captureAuthor.trim() || !captureText.trim()}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0A66C2] px-4 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            Add capture
          </button>
        </div>

        <div className="mt-6 grid gap-2">
          {captures.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black/70">
              No captures yet.
            </div>
          ) : (
            captures.map((c) => {
              const src = c.sourceId ? sourcesById.get(c.sourceId) : null;
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-black/10 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-black">
                        {c.authorName}
                      </div>
                      <div className="mt-1 text-xs text-black/60">
                        {src ? `Source: ${src.name}` : "Source: —"} · Captured{" "}
                        {new Date(c.capturedAt).toLocaleString()}
                      </div>
                      {c.postUrl ? (
                        <div className="mt-1 break-all text-xs text-black/60">
                          {c.postUrl}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCapture(c.id)}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold text-black/70 hover:bg-black/[0.03]"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-black/80">
                    {c.text.length > 600 ? `${c.text.slice(0, 600)}…` : c.text}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

