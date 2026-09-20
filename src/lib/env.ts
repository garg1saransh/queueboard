import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  JOB_SUCCESS_RATE: z.coerce.number().min(0).max(1).default(0.7),
  JOB_MIN_DELAY_MS: z.coerce.number().int().positive().default(1000),
  JOB_MAX_DELAY_MS: z.coerce.number().int().positive().default(5000),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${details}`);
  }

  if (parsed.data.JOB_MIN_DELAY_MS > parsed.data.JOB_MAX_DELAY_MS) {
    throw new Error("JOB_MIN_DELAY_MS must be <= JOB_MAX_DELAY_MS");
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
