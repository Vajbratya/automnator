import type { ActionLog, CapturedPost, Draft, Post, ResearchSource, Schedule, User } from "@/lib/store/types";

export type DraftCreateInput = {
  title: string;
  content?: string;
  language?: Draft["language"];
};

export type DraftUpdateInput = Partial<Pick<Draft, "title" | "content" | "language" | "status">> & {
  promptVersion?: string;
};

export type ScheduleCreateInput = {
  draftId: string;
  runAt: string; // ISO datetime
  timezone: string;
};

export type ResearchSourceCreateInput = {
  type: ResearchSource["type"];
  name: string;
  profileUrl?: string;
  keyword?: string;
};

export type CaptureCreateInput = {
  sourceId?: string;
  authorName: string;
  authorUrl?: string;
  postUrl?: string;
  text: string;
  capturedAt?: string;
};

export interface Store {
  getOrCreateUserByEmail(email: string): Promise<User>;
  getUserById(userId: string): Promise<User | null>;

  listSources(userId: string): Promise<ResearchSource[]>;
  createSource(userId: string, input: ResearchSourceCreateInput): Promise<ResearchSource>;
  deleteSource(userId: string, sourceId: string): Promise<void>;

  listCaptures(userId: string): Promise<CapturedPost[]>;
  createCapture(userId: string, input: CaptureCreateInput): Promise<CapturedPost>;
  deleteCapture(userId: string, captureId: string): Promise<void>;

  listDrafts(userId: string): Promise<Draft[]>;
  getDraft(userId: string, draftId: string): Promise<Draft | null>;
  createDraft(userId: string, input: DraftCreateInput): Promise<Draft>;
  updateDraft(userId: string, draftId: string, input: DraftUpdateInput): Promise<Draft>;
  deleteDraft(userId: string, draftId: string): Promise<void>;

  listSchedules(userId: string): Promise<Schedule[]>;
  createSchedule(userId: string, input: ScheduleCreateInput): Promise<Schedule>;
  approveSchedule(userId: string, scheduleId: string): Promise<Schedule>;
  rejectSchedule(userId: string, scheduleId: string): Promise<Schedule>;

  listPosts(userId: string): Promise<Post[]>;
  listActionLogs(userId: string): Promise<ActionLog[]>;

  claimDueSchedules(nowIso: string, limit: number): Promise<Schedule[]>;
  markScheduleSucceeded(
    scheduleId: string,
    result: { executedAt: string; providerPostId: string; url?: string }
  ): Promise<void>;
  markScheduleFailed(scheduleId: string, result: { executedAt: string; error: string }): Promise<void>;
}
