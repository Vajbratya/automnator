import { z } from "zod";

export const LinkedInProfileSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
});
export type LinkedInProfile = z.infer<typeof LinkedInProfileSchema>;

export const LinkedInPostSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  createdAt: z.string().datetime(),
  url: z.string().url().optional(),
});
export type LinkedInPost = z.infer<typeof LinkedInPostSchema>;

export const CreatePostInputSchema = z.object({
  text: z.string().min(1),
});
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

export const CreatePostResultSchema = z.object({
  postId: z.string().min(1),
  url: z.string().url().optional(),
});
export type CreatePostResult = z.infer<typeof CreatePostResultSchema>;

