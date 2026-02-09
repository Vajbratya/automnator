import { createHmac, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import type { LinkedInClient } from "@/lib/linkedin/client";
import type { CreatePostInput, CreatePostResult, LinkedInProfile } from "@/lib/linkedin/types";

type WebhookResponse = {
  postId: string;
  url?: string;
};

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const aa = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (aa.length !== bb.length) return false;
    return timingSafeEqual(aa, bb);
  } catch {
    return false;
  }
}

export class WebhookLinkedInClient implements LinkedInClient {
  constructor(private readonly userEmail: string) {}

  async getProfile(): Promise<LinkedInProfile> {
    return {
      id: `webhook:${this.userEmail}`,
      displayName: this.userEmail.split("@")[0] ?? "User",
    };
  }

  async createPost(input: CreatePostInput): Promise<CreatePostResult> {
    const env = getServerEnv();
    const url = env.PUBLISH_WEBHOOK_URL;
    if (!url) {
      throw new Error("Missing PUBLISH_WEBHOOK_URL for webhook publisher.");
    }

    const payload = {
      provider: "linkedin",
      email: this.userEmail,
      text: input.text,
      createdAt: new Date().toISOString(),
    };
    const body = JSON.stringify(payload);

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (env.PUBLISH_WEBHOOK_SECRET) {
      headers["x-automnator-signature"] = sign(body, env.PUBLISH_WEBHOOK_SECRET);
    }

    const res = await fetch(url, { method: "POST", headers, body });
    if (!res.ok) throw new Error(`Webhook publisher failed (${res.status}).`);

    const data = (await res.json().catch(() => null)) as unknown;
    if (!data || typeof data !== "object") throw new Error("Webhook publisher returned invalid JSON.");

    const postId = (data as WebhookResponse).postId;
    const postUrl = (data as WebhookResponse).url;
    if (!postId || typeof postId !== "string") throw new Error("Webhook publisher missing postId.");

    // If the receiver echoes signature back, verify (optional hardening).
    const echoed = res.headers.get("x-automnator-signature");
    if (echoed && env.PUBLISH_WEBHOOK_SECRET) {
      const expected = sign(body, env.PUBLISH_WEBHOOK_SECRET);
      if (!safeEqualHex(echoed, expected)) {
        throw new Error("Webhook signature verification failed.");
      }
    }

    return { postId, url: typeof postUrl === "string" ? postUrl : undefined };
  }
}

