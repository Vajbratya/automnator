import { z } from "zod";

import type { CapturedPost, ResearchSource } from "@/lib/store/types";
import type { GeneratePostInput, GeneratedPost, Language } from "@/lib/ai/types";
import { generateMockPost } from "@/lib/ai/mock";
import { getServerEnv } from "@/lib/env";

const OpenRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
        }),
      })
    )
    .min(1),
  error: z
    .object({
      message: z.string().optional(),
    })
    .optional(),
});

const PlanSchema = z.object({
  posts: z
    .array(
      z.object({
        title: z.string().min(1),
        hook: z.string().min(1),
        body: z.string().min(1),
        cta: z.string().min(1),
        angle: z.string().min(1).optional(),
      })
    )
    .min(1),
});

export type PlannedPost = {
  title: string;
  angle?: string;
} & GeneratedPost;

function extractJsonObject(text: string): string | null {
  const s = text.trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1);
}

function languageLabel(language: Language): string {
  if (language === "pt-BR") return "Portuguese (Brazil)";
  return "English";
}

function clampText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function summarizeSources(sources: ResearchSource[]): string {
  if (sources.length === 0) return "(none)";
  return sources
    .slice(0, 20)
    .map((s) => {
      if (s.type === "person") return `- Person: ${s.name}${s.profileUrl ? ` (${s.profileUrl})` : ""}`;
      return `- Keyword: ${s.name}${s.keyword ? ` (${s.keyword})` : ""}`;
    })
    .join("\n");
}

function summarizeCaptures(captures: CapturedPost[]): string {
  if (captures.length === 0) return "(none)";
  return captures
    .slice(0, 20)
    .map((c) => {
      const head = clampText(c.text.replace(/\s+/g, " ").trim(), 260);
      return `- ${c.authorName}: ${head}`;
    })
    .join("\n");
}

export async function generatePlan(options: {
  language: Language;
  niche: string;
  tone?: string;
  goal?: string;
  postCount: number;
  sources: ResearchSource[];
  captures: CapturedPost[];
}): Promise<PlannedPost[]> {
  const env = getServerEnv();
  const niche = options.niche.trim();
  if (!niche) throw new Error("niche is required.");

  if (env.MOCK_AI) {
    const posts: PlannedPost[] = [];
    for (let i = 0; i < options.postCount; i += 1) {
      const input: GeneratePostInput = {
        topic: `${niche} (idea ${i + 1})`,
        language: options.language,
        audience: undefined,
        tone: options.tone,
        variantCount: 1,
      };
      const gen = generateMockPost(input);
      posts.push({
        title: clampText(gen.hook, 80),
        ...gen,
      });
    }
    return posts;
  }

  const apiKey = (env.OPENROUTER_API_KEY ?? env.OPENROUTER_API_KEYH ?? "").trim();
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY (or OPENROUTER_API_KEYH).");
  const baseUrl = (env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/+$/, "");
  const model = (env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini").trim();

  const system = [
    "You are a LinkedIn strategist and copywriter.",
    "Your job: propose original posts that fit the user's niche AND are likely to trigger comments.",
    "Use the inspiration posts only for pattern mining; do not copy their wording.",
    "Output MUST be valid JSON only. No markdown. No extra keys.",
    "No hashtags unless explicitly requested (default: no hashtags).",
  ].join("\n");

  const user = [
    `Language: ${languageLabel(options.language)}`,
    `Niche: ${niche}`,
    options.goal?.trim() ? `Goal: ${options.goal.trim()}` : "Goal: (not specified)",
    options.tone?.trim() ? `Tone: ${options.tone.trim()}` : "Tone: (not specified)",
    `Post count: ${options.postCount}`,
    "",
    "Sources (people/keywords):",
    summarizeSources(options.sources),
    "",
    "Inspiration posts (captured):",
    summarizeCaptures(options.captures),
    "",
    "Return JSON exactly in this shape:",
    '{ "posts": [ { "title": "…", "hook": "…", "body": "…", "cta": "…", "angle": "…" } ] }',
  ].join("\n");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "x-title": "automnator",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 1400,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const raw = (await res.json().catch(() => null)) as unknown;
  const parsed = OpenRouterResponseSchema.safeParse(raw);
  if (!parsed.success) throw new Error("OpenRouter returned an unexpected response shape.");
  if (!res.ok) throw new Error(parsed.data.error?.message ?? `OpenRouter request failed (${res.status}).`);

  const content = parsed.data.choices[0]?.message.content ?? "";
  const jsonText = extractJsonObject(content);
  if (!jsonText) throw new Error("Planner did not return JSON.");

  const payload = PlanSchema.safeParse(JSON.parse(jsonText));
  if (!payload.success) throw new Error("Planner JSON did not match the expected schema.");

  return payload.data.posts.slice(0, options.postCount).map((p) => {
    const hook = clampText(p.hook.trim(), 180);
    const body = p.body.trim();
    const cta = p.cta.trim();
    const fullText = [hook, "", body, "", cta].join("\n");
    return { title: p.title.trim(), angle: p.angle?.trim(), hook, body, cta, fullText };
  });
}

