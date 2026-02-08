import { newId } from "@/lib/ids";
import type { LinkedInClient } from "@/lib/linkedin/client";
import type { CreatePostInput, CreatePostResult, LinkedInProfile } from "@/lib/linkedin/types";

export class MockLinkedInClient implements LinkedInClient {
  constructor(private readonly userEmail: string) {}

  async getProfile(): Promise<LinkedInProfile> {
    return {
      id: `mock:${this.userEmail}`,
      displayName: this.userEmail.split("@")[0] ?? "Mock User",
    };
  }

  async createPost(input: CreatePostInput): Promise<CreatePostResult> {
    // Deterministic-ish for logs. We don't persist the post body in mock mode.
    void input.text.length;
    const postId = `mock_post_${newId()}`;
    const url = `https://www.linkedin.com/feed/update/${postId}/`;
    return { postId, url };
  }
}
