import { getServerEnv } from "@/lib/env";
import type { LinkedInClient } from "@/lib/linkedin/client";
import { MockLinkedInClient } from "@/lib/linkedin/mock";
import { WebhookLinkedInClient } from "@/lib/linkedin/webhook";

export function getLinkedInClient(userEmail: string): LinkedInClient {
  const env = getServerEnv();
  if (env.MOCK_LINKEDIN) return new MockLinkedInClient(userEmail);

  if (env.PUBLISH_WEBHOOK_URL) return new WebhookLinkedInClient(userEmail);

  throw new Error("LinkedIn publishing is disabled. Configure PUBLISH_WEBHOOK_URL or set MOCK_LINKEDIN=true.");
}
