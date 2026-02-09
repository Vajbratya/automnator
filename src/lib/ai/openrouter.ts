import { z } from "zod";

import type { GeneratePostInput, GeneratedPost, Language } from "@/lib/ai/types";
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

const VariantsSchema = z.object({
  variants: z
    .array(
      z.object({
        hook: z.string().min(1),
        body: z.string().min(1),
        cta: z.string().min(1),
      })
    )
    .min(1),
});

function clampText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function languageLabel(language: Language): string {
  if (language === "pt-BR") return "Portuguese (Brazil)";
  return "English";
}

function buildPrompt(input: GeneratePostInput): { system: string; user: string } {
  const lang = languageLabel(input.language);
  const audience = input.audience?.trim() ? input.audience.trim() : null;
  const tone = input.tone?.trim() ? input.tone.trim() : null;
  const variantCount = input.variantCount;

  const system = [
    "You write high-performing LinkedIn posts that feel human and specific (not generic).",
    "Output MUST be valid JSON only. No markdown. No extra keys.",
    "Constraints:",
    "- hook: <= 180 chars, single paragraph.",
    "- body: multi-line, lots of whitespace, can include a short numbered list.",
    "- cta: 1-2 sentences that invite comments (not 'buy now').",
    "- Avoid hashtags unless explicitly requested (default: no hashtags).",
  ].join("\n");

  const user = [
    `Language: ${lang}`,
    `Topic: ${input.topic.trim()}`,
    audience ? `Audience: ${audience}` : "Audience: (not specified)",
    tone ? `Tone: ${tone}` : "Tone: (not specified)",
    `Create ${variantCount} distinct variants.`,
    "",
    "Return JSON exactly in this shape:",
    '{ "variants": [ { "hook": "…", "body": "…", "cta": "…" } ] }',
  ].join("\n");

  return { system, user };
}

function extractJsonObject(text: string): string | null {
  const s = text.trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1);
}

export async function generateOpenRouterPosts(input: GeneratePostInput): Promise<GeneratedPost[]> {
  const env = getServerEnv();

  const apiKey = (env.OPENROUTER_API_KEY ?? env.OPENROUTER_API_KEYH ?? "").trim();
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY (or OPENROUTER_API_KEYH).");
  }

  const baseUrl = (env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/+$/, "");
  const model = (env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini").trim();

  const { system, user } = buildPrompt(input);

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
      max_tokens: 900,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const raw = (await res.json().catch(() => null)) as unknown;
  const parsed = OpenRouterResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("OpenRouter returned an unexpected response shape.");
  }
  if (!res.ok) {
    throw new Error(parsed.data.error?.message ?? `OpenRouter request failed (${res.status}).`);
  }

  const content = parsed.data.choices[0]?.message.content ?? "";
  const jsonText = extractJsonObject(content);
  if (!jsonText) throw new Error("OpenRouter did not return JSON.");

  const payload = VariantsSchema.safeParse(JSON.parse(jsonText));
  if (!payload.success) throw new Error("OpenRouter JSON did not match the expected schema.");

  // Normalize + compute fullText.
  const variants = payload.data.variants.slice(0, input.variantCount).map((v) => {
    const hook = clampText(v.hook.trim(), 180);
    const body = v.body.trim();
    const cta = v.cta.trim();
    const fullText = [hook, "", body, "", cta].join("\n");
    return { hook, body, cta, fullText } satisfies GeneratedPost;
  });

  // If the model returned fewer variants than requested, pad with lightweight rewrites.
  while (variants.length < input.variantCount) {
    const base = variants[variants.length - 1] ?? variants[0];
    if (!base) break;
    variants.push({
      ...base,
      hook: clampText(`${base.hook} (alt ${variants.length + 1})`, 180),
      fullText: clampText(`${base.fullText}\n\n(alt ${variants.length + 1})`, 4000),
    });
  }

  return variants;
}

