import { z } from "zod";

function formatZodError(error: z.ZodError): string {
  const lines = error.issues.map((i) => {
    const path = i.path.length ? i.path.join(".") : "(root)";
    return `- ${path}: ${i.message}`;
  });
  return lines.join("\n");
}

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),

  APP_SESSION_SECRET: z.string().min(16).optional(),
  AUTOMNATOR_DB_PATH: z.string().min(1).optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  LI_SESSION_ENCRYPTION_KEY: z.string().min(1).optional(),

  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEYH: z.string().min(1).optional(),
  OPENROUTER_MODEL: z.string().min(1).optional(),
  OPENROUTER_BASE_URL: z.string().url().optional(),

  MOCK_LINKEDIN: z.coerce.boolean().optional(),
  MOCK_AI: z.coerce.boolean().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema> & {
  MOCK_LINKEDIN: boolean;
  MOCK_AI: boolean;
};

let cachedServerEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${formatZodError(parsed.error)}`);
  }

  cachedServerEnv = {
    ...parsed.data,
    MOCK_LINKEDIN: parsed.data.MOCK_LINKEDIN ?? true,
    MOCK_AI: parsed.data.MOCK_AI ?? true,
  };
  return cachedServerEnv;
}
