import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { FileStore } from "@/lib/store/file-store";
import { nowIso } from "@/lib/time";

async function mkTmpDbPath(): Promise<{ dir: string; dbPath: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "automnator-"));
  const dbPath = path.join(dir, "db.json");
  return { dir, dbPath };
}

test("FileStore: user create/get is stable by email", async (t) => {
  const { dir, dbPath } = await mkTmpDbPath();
  t.after(async () => fs.rm(dir, { recursive: true, force: true }));

  const store = new FileStore({ dbPath });
  const u1 = await store.getOrCreateUserByEmail("Test@Example.com");
  const u2 = await store.getOrCreateUserByEmail("test@example.com");

  assert.equal(u1.id, u2.id);
  assert.equal(u1.email, "test@example.com");

  const fetched = await store.getUserById(u1.id);
  assert.ok(fetched);
  assert.equal(fetched?.email, "test@example.com");
});

test("FileStore: draft lifecycle (create/update/list/delete)", async (t) => {
  const { dir, dbPath } = await mkTmpDbPath();
  t.after(async () => fs.rm(dir, { recursive: true, force: true }));

  const store = new FileStore({ dbPath });
  const user = await store.getOrCreateUserByEmail("drafts@example.com");

  const d1 = await store.createDraft(user.id, {
    title: "Hello",
    content: "First post",
    language: "en",
  });

  const updated = await store.updateDraft(user.id, d1.id, {
    title: "Hello world",
    content: "Updated content",
    language: "pt-BR",
  });
  assert.equal(updated.title, "Hello world");
  assert.equal(updated.language, "pt-BR");

  const listed = await store.listDrafts(user.id);
  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.id, d1.id);

  const fetched = await store.getDraft(user.id, d1.id);
  assert.ok(fetched);
  assert.equal(fetched?.content, "Updated content");

  await store.deleteDraft(user.id, d1.id);
  const after = await store.listDrafts(user.id);
  assert.equal(after.length, 0);
});

test("FileStore: schedule approval, claim, and success creates a post", async (t) => {
  const { dir, dbPath } = await mkTmpDbPath();
  t.after(async () => fs.rm(dir, { recursive: true, force: true }));

  const store = new FileStore({ dbPath });
  const user = await store.getOrCreateUserByEmail("sched@example.com");
  const draft = await store.createDraft(user.id, {
    title: "Sched",
    content: "This will be published",
    language: "en",
  });

  const runAtPast = new Date(Date.now() - 60_000).toISOString();
  const sched = await store.createSchedule(user.id, {
    draftId: draft.id,
    runAt: runAtPast,
    timezone: "UTC",
  });
  assert.equal(sched.approvalState, "pending");
  assert.equal(sched.status, "queued");

  const approved = await store.approveSchedule(user.id, sched.id);
  assert.equal(approved.approvalState, "approved");

  const claimed = await store.claimDueSchedules(nowIso(), 10);
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0]?.id, sched.id);
  assert.equal(claimed[0]?.status, "running");

  const executedAt = nowIso();
  await store.markScheduleSucceeded(sched.id, {
    executedAt,
    providerPostId: "li_test_123",
    url: "https://www.linkedin.com/feed/update/urn:li:activity:123",
  });

  const schedules = await store.listSchedules(user.id);
  const finalSched = schedules.find((s) => s.id === sched.id);
  assert.equal(finalSched?.status, "succeeded");

  const drafts = await store.listDrafts(user.id);
  const finalDraft = drafts.find((d) => d.id === draft.id);
  assert.equal(finalDraft?.status, "published");

  const posts = await store.listPosts(user.id);
  assert.equal(posts.length, 1);
  assert.equal(posts[0]?.providerPostId, "li_test_123");

  const logs = await store.listActionLogs(user.id);
  assert.ok(logs.length >= 1);
});

test("FileStore: research sources and captures lifecycle", async (t) => {
  const { dir, dbPath } = await mkTmpDbPath();
  t.after(async () => fs.rm(dir, { recursive: true, force: true }));

  const store = new FileStore({ dbPath });
  const user = await store.getOrCreateUserByEmail("research@example.com");

  const src = await store.createSource(user.id, {
    type: "person",
    name: "Jane Doe",
    profileUrl: "https://www.linkedin.com/in/jane-doe/",
  });

  const sources = await store.listSources(user.id);
  assert.equal(sources.length, 1);
  assert.equal(sources[0]?.id, src.id);

  const cap = await store.createCapture(user.id, {
    sourceId: src.id,
    authorName: "Jane Doe",
    postUrl: "https://www.linkedin.com/posts/jane-doe_123",
    text: "A short post about compounding.",
    capturedAt: new Date().toISOString(),
  });

  const captures = await store.listCaptures(user.id);
  assert.equal(captures.length, 1);
  assert.equal(captures[0]?.id, cap.id);
  assert.equal(captures[0]?.sourceId, src.id);

  await store.deleteSource(user.id, src.id);
  const sourcesAfter = await store.listSources(user.id);
  assert.equal(sourcesAfter.length, 0);

  const capturesAfter = await store.listCaptures(user.id);
  assert.equal(capturesAfter.length, 1);
  assert.equal(capturesAfter[0]?.sourceId, undefined);

  await store.deleteCapture(user.id, cap.id);
  const capturesFinal = await store.listCaptures(user.id);
  assert.equal(capturesFinal.length, 0);
});
