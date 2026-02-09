import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const ResearchSourceTypeSchema = z.enum(["person", "keyword"]);
export type ResearchSourceType = z.infer<typeof ResearchSourceTypeSchema>;

export const ResearchSourceSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  type: ResearchSourceTypeSchema,
  name: z.string().min(1),
  profileUrl: z.string().url().optional(),
  keyword: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ResearchSource = z.infer<typeof ResearchSourceSchema>;

export const CapturedPostSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  sourceId: z.string().min(1).optional(),
  authorName: z.string().min(1),
  authorUrl: z.string().url().optional(),
  postUrl: z.string().url().optional(),
  text: z.string().min(1),
  capturedAt: z.string().datetime(),
});
export type CapturedPost = z.infer<typeof CapturedPostSchema>;

export const DraftStatusSchema = z.enum(["draft", "scheduled", "published"]);
export type DraftStatus = z.infer<typeof DraftStatusSchema>;

export const DraftSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  title: z.string().min(1),
  content: z.string(),
  language: z.enum(["en", "pt-BR"]),
  status: DraftStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  promptVersion: z.string().min(1).optional(),
});
export type Draft = z.infer<typeof DraftSchema>;

export const ApprovalStateSchema = z.enum(["pending", "approved", "rejected"]);
export type ApprovalState = z.infer<typeof ApprovalStateSchema>;

export const ScheduleStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "canceled",
]);
export type ScheduleStatus = z.infer<typeof ScheduleStatusSchema>;

export const ScheduleSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  draftId: z.string().min(1),
  runAt: z.string().datetime(),
  timezone: z.string().min(1),
  approvalState: ApprovalStateSchema,
  status: ScheduleStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  executedAt: z.string().datetime().optional(),
  lastError: z.string().optional(),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const PostSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  draftId: z.string().min(1),
  scheduleId: z.string().min(1),
  provider: z.literal("linkedin"),
  providerPostId: z.string().min(1),
  url: z.string().url().optional(),
  publishedAt: z.string().datetime(),
});
export type Post = z.infer<typeof PostSchema>;

export const ActionTypeSchema = z.enum(["publish", "fetch_analytics"]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

export const ActionLogSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  scheduleId: z.string().min(1).optional(),
  type: ActionTypeSchema,
  status: z.enum(["ok", "error"]),
  message: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type ActionLog = z.infer<typeof ActionLogSchema>;

export const DbSchema = z.object({
  version: z.literal(1).default(1),
  users: z.record(z.string(), UserSchema).default({}),
  sources: z.record(z.string(), ResearchSourceSchema).default({}),
  captures: z.record(z.string(), CapturedPostSchema).default({}),
  drafts: z.record(z.string(), DraftSchema).default({}),
  schedules: z.record(z.string(), ScheduleSchema).default({}),
  posts: z.record(z.string(), PostSchema).default({}),
  actionLogs: z.record(z.string(), ActionLogSchema).default({}),
});
export type Db = z.infer<typeof DbSchema>;
