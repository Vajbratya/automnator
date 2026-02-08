import { getServerEnv } from "@/lib/env";
import type { LinkedInClient } from "@/lib/linkedin/client";
import { MockLinkedInClient } from "@/lib/linkedin/mock";

export function getLinkedInClient(userEmail: string): LinkedInClient {
  const env = getServerEnv();
  if (env.MOCK_LINKEDIN) return new MockLinkedInClient(userEmail);

  // Placeholder for a real adapter (e.g. linkedin-private-api or Playwright).
  // Keep this explicit so production can't silently run without integration.
  throw new Error(
    "LinkedIn integration is disabled. Set MOCK_LINKEDIN=true (default) for mock mode, or implement a real LinkedIn adapter."
  );
}

