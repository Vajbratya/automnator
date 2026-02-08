import type { CreatePostInput, CreatePostResult, LinkedInProfile } from "@/lib/linkedin/types";

export interface LinkedInClient {
  getProfile(): Promise<LinkedInProfile>;
  createPost(input: CreatePostInput): Promise<CreatePostResult>;
}

