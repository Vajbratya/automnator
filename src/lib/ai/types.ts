import { z } from "zod";

export const LanguageSchema = z.enum(["en", "pt-BR"]);
export type Language = z.infer<typeof LanguageSchema>;

export const GeneratePostInputSchema = z.object({
  topic: z.string().min(1),
  language: LanguageSchema.default("en"),
  audience: z.string().min(1).optional(),
  tone: z.string().min(1).optional(),
  variantCount: z.number().int().min(1).max(5).default(3),
});
export type GeneratePostInput = z.infer<typeof GeneratePostInputSchema>;

export const GeneratedPostSchema = z.object({
  hook: z.string().min(1),
  body: z.string().min(1),
  cta: z.string().min(1),
  fullText: z.string().min(1),
});
export type GeneratedPost = z.infer<typeof GeneratedPostSchema>;

export const ScoredDraftSchema = z.object({
  score: z.number().min(0).max(100),
  reasons: z.array(z.string().min(1)),
});
export type ScoredDraft = z.infer<typeof ScoredDraftSchema>;

