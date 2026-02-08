import fs from "node:fs/promises";
import path from "node:path";

import { newId } from "@/lib/ids";
import { nowIso, parseIsoDate } from "@/lib/time";
import type {
  ActionLog,
  Db,
  Draft,
  Schedule,
  User,
} from "@/lib/store/types";
import { DbSchema, DraftStatusSchema, ScheduleStatusSchema } from "@/lib/store/types";
import type {
  DraftCreateInput,
  DraftUpdateInput,
  ScheduleCreateInput,
  Store,
} from "@/lib/store/store";

const DEFAULT_DB: Db = {
  version: 1,
  users: {},
  drafts: {},
  schedules: {},
  posts: {},
  actionLogs: {},
};

type FileStoreOptions = {
  dbPath: string;
};

function toTitleFromContent(content: string): string {
  const firstLine = content
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  return firstLine ? firstLine.slice(0, 80) : "Untitled draft";
}

export class FileStore implements Store {
  private readonly dbPath: string;
  private opChain: Promise<unknown> = Promise.resolve();

  constructor(options: FileStoreOptions) {
    this.dbPath = options.dbPath;
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
  }

  private async readDb(): Promise<Db> {
    await this.ensureDir();
    try {
      const raw = await fs.readFile(this.dbPath, "utf8");
      const parsed = DbSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return DEFAULT_DB;
      return parsed.data;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_DB;
      throw err;
    }
  }

  private async writeDb(db: Db): Promise<void> {
    await this.ensureDir();
    const tmp = `${this.dbPath}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(db, null, 2)}\n`, "utf8");
    await fs.rename(tmp, this.dbPath);
  }

  private async withDbWrite<T>(fn: (db: Db) => Promise<T> | T): Promise<T> {
    // Serialize operations per-process to reduce lost updates.
    const run = async (): Promise<T> => {
      const db = await this.readDb();
      const result = await fn(db);
      await this.writeDb(db);
      return result;
    };
    const next = this.opChain.then(run, run);
    this.opChain = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  async getOrCreateUserByEmail(email: string): Promise<User> {
    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm) throw new Error("Email is required.");

    return this.withDbWrite((db) => {
      const existing = Object.values(db.users).find(
        (u) => u.email.toLowerCase() === emailNorm
      );
      if (existing) return existing;

      const user: User = { id: newId(), email: emailNorm, createdAt: nowIso() };
      db.users[user.id] = user;
      return user;
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    const db = await this.readDb();
    return db.users[userId] ?? null;
  }

  async listDrafts(userId: string): Promise<Draft[]> {
    const db = await this.readDb();
    return Object.values(db.drafts)
      .filter((d) => d.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getDraft(userId: string, draftId: string): Promise<Draft | null> {
    const db = await this.readDb();
    const draft = db.drafts[draftId];
    if (!draft || draft.userId !== userId) return null;
    return draft;
  }

  async createDraft(userId: string, input: DraftCreateInput): Promise<Draft> {
    return this.withDbWrite((db) => {
      const now = nowIso();
      const title = input.title.trim() || "Untitled draft";
      const content = input.content ?? "";
      const draft: Draft = {
        id: newId(),
        userId,
        title,
        content,
        language: input.language ?? "en",
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };
      db.drafts[draft.id] = draft;
      return draft;
    });
  }

  async updateDraft(userId: string, draftId: string, input: DraftUpdateInput): Promise<Draft> {
    return this.withDbWrite((db) => {
      const draft = db.drafts[draftId];
      if (!draft || draft.userId !== userId) {
        throw new Error("Draft not found.");
      }

      const nextStatus = input.status ?? draft.status;
      // Validate status values.
      DraftStatusSchema.parse(nextStatus);

      const next: Draft = {
        ...draft,
        title:
          input.title !== undefined
            ? input.title.trim() || toTitleFromContent(input.content ?? draft.content)
            : draft.title,
        content: input.content ?? draft.content,
        language: input.language ?? draft.language,
        status: nextStatus,
        updatedAt: nowIso(),
        promptVersion: input.promptVersion ?? draft.promptVersion,
      };

      db.drafts[draftId] = next;
      return next;
    });
  }

  async deleteDraft(userId: string, draftId: string): Promise<void> {
    await this.withDbWrite((db) => {
      const draft = db.drafts[draftId];
      if (!draft || draft.userId !== userId) return;
      delete db.drafts[draftId];
      // Soft-clean schedules referencing this draft.
      for (const s of Object.values(db.schedules)) {
        if (s.userId === userId && s.draftId === draftId) {
          s.status = "canceled";
          s.updatedAt = nowIso();
          s.lastError = "Draft deleted.";
        }
      }
    });
  }

  async listSchedules(userId: string): Promise<Schedule[]> {
    const db = await this.readDb();
    return Object.values(db.schedules)
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.runAt.localeCompare(a.runAt));
  }

  async createSchedule(userId: string, input: ScheduleCreateInput): Promise<Schedule> {
    const runAtDate = parseIsoDate(input.runAt);
    if (!runAtDate) throw new Error("Invalid runAt datetime.");
    if (!input.timezone.trim()) throw new Error("timezone is required.");

    return this.withDbWrite((db) => {
      const draft = db.drafts[input.draftId];
      if (!draft || draft.userId !== userId) throw new Error("Draft not found.");

      const now = nowIso();
      const schedule: Schedule = {
        id: newId(),
        userId,
        draftId: input.draftId,
        runAt: runAtDate.toISOString(),
        timezone: input.timezone,
        approvalState: "pending",
        status: "queued",
        createdAt: now,
        updatedAt: now,
      };
      db.schedules[schedule.id] = schedule;

      // Mark draft as scheduled.
      draft.status = "scheduled";
      draft.updatedAt = now;
      db.drafts[draft.id] = draft;

      return schedule;
    });
  }

  async approveSchedule(userId: string, scheduleId: string): Promise<Schedule> {
    return this.withDbWrite((db) => {
      const s = db.schedules[scheduleId];
      if (!s || s.userId !== userId) throw new Error("Schedule not found.");
      if (s.status !== "queued") throw new Error("Schedule is not in queued state.");
      s.approvalState = "approved";
      s.updatedAt = nowIso();
      db.schedules[s.id] = s;
      return s;
    });
  }

  async rejectSchedule(userId: string, scheduleId: string): Promise<Schedule> {
    return this.withDbWrite((db) => {
      const s = db.schedules[scheduleId];
      if (!s || s.userId !== userId) throw new Error("Schedule not found.");
      if (s.status !== "queued") throw new Error("Schedule is not in queued state.");
      s.approvalState = "rejected";
      s.status = "canceled";
      s.updatedAt = nowIso();
      db.schedules[s.id] = s;
      return s;
    });
  }

  async listPosts(userId: string) {
    const db = await this.readDb();
    return Object.values(db.posts)
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  async listActionLogs(userId: string) {
    const db = await this.readDb();
    return Object.values(db.actionLogs)
      .filter((l) => l.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async claimDueSchedules(nowIsoStr: string, limit: number): Promise<Schedule[]> {
    const now = parseIsoDate(nowIsoStr) ?? new Date();

    return this.withDbWrite((db) => {
      const due = Object.values(db.schedules)
        .filter((s) => {
          if (s.approvalState !== "approved") return false;
          if (s.status !== "queued") return false;
          const runAt = parseIsoDate(s.runAt);
          return runAt ? runAt <= now : false;
        })
        .sort((a, b) => a.runAt.localeCompare(b.runAt))
        .slice(0, Math.max(1, limit));

      const claimedAt = nowIso();
      for (const s of due) {
        s.status = "running";
        s.updatedAt = claimedAt;
        db.schedules[s.id] = s;

        const log: ActionLog = {
          id: newId(),
          userId: s.userId,
          scheduleId: s.id,
          type: "publish",
          status: "ok",
          message: "Claimed by worker.",
          createdAt: claimedAt,
        };
        db.actionLogs[log.id] = log;
      }

      return due;
    });
  }

  async markScheduleSucceeded(
    scheduleId: string,
    result: { executedAt: string; providerPostId: string; url?: string }
  ): Promise<void> {
    await this.withDbWrite((db) => {
      const s = db.schedules[scheduleId];
      if (!s) throw new Error("Schedule not found.");

      ScheduleStatusSchema.parse(s.status);
      s.status = "succeeded";
      s.executedAt = result.executedAt;
      s.updatedAt = result.executedAt;
      s.lastError = undefined;
      db.schedules[s.id] = s;

      const draft = db.drafts[s.draftId];
      if (draft) {
        draft.status = "published";
        draft.updatedAt = result.executedAt;
        db.drafts[draft.id] = draft;
      }

      const postId = newId();
      db.posts[postId] = {
        id: postId,
        userId: s.userId,
        draftId: s.draftId,
        scheduleId: s.id,
        provider: "linkedin",
        providerPostId: result.providerPostId,
        url: result.url,
        publishedAt: result.executedAt,
      };

      const log: ActionLog = {
        id: newId(),
        userId: s.userId,
        scheduleId: s.id,
        type: "publish",
        status: "ok",
        message: `Published as ${result.providerPostId}.`,
        createdAt: result.executedAt,
      };
      db.actionLogs[log.id] = log;
    });
  }

  async markScheduleFailed(scheduleId: string, result: { executedAt: string; error: string }): Promise<void> {
    await this.withDbWrite((db) => {
      const s = db.schedules[scheduleId];
      if (!s) throw new Error("Schedule not found.");

      ScheduleStatusSchema.parse(s.status);
      s.status = "failed";
      s.executedAt = result.executedAt;
      s.updatedAt = result.executedAt;
      s.lastError = result.error;
      db.schedules[s.id] = s;

      const log: ActionLog = {
        id: newId(),
        userId: s.userId,
        scheduleId: s.id,
        type: "publish",
        status: "error",
        message: result.error,
        createdAt: result.executedAt,
      };
      db.actionLogs[log.id] = log;
    });
  }
}
