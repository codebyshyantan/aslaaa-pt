import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_ORIGIN: z.string().url().default("http://localhost:5173"),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().optional(),
  DATABASE_URL: z.string().min(1).optional(),
  DATA_STORAGE_DRIVER: z.enum(["postgres", "memory"]).optional(),
  AUTH_STORAGE_DRIVER: z.enum(["postgres", "memory"]).optional(),
  SESSION_COOKIE_NAME: z.string().min(3).max(64).default("aslaaa_pt_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().max(24 * 90).default(168),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(8),
  COOKIE_SECURE: booleanFromEnv.optional(),
  MEMORY_SEED_ADMIN_PASSWORD: z.string().min(6).default("Admin@123"),
  MEMORY_SEED_PT_PASSWORD: z.string().min(6).default("Pt@123"),
});

export function loadEnv(source: NodeJS.ProcessEnv = process.env) {
  const parsedEnv = rawEnvSchema.safeParse({
    NODE_ENV: source.NODE_ENV,
    PORT: source.PORT,
    APP_ORIGIN: source.APP_ORIGIN,
    CORS_ORIGIN: source.CORS_ORIGIN,
    CORS_ORIGINS: source.CORS_ORIGINS,
    DATABASE_URL: source.DATABASE_URL,
    DATA_STORAGE_DRIVER: source.DATA_STORAGE_DRIVER,
    AUTH_STORAGE_DRIVER: source.AUTH_STORAGE_DRIVER,
    SESSION_COOKIE_NAME: source.SESSION_COOKIE_NAME,
    SESSION_TTL_HOURS: source.SESSION_TTL_HOURS,
    AUTH_RATE_LIMIT_WINDOW_MS: source.AUTH_RATE_LIMIT_WINDOW_MS,
    AUTH_RATE_LIMIT_MAX: source.AUTH_RATE_LIMIT_MAX,
    COOKIE_SECURE: source.COOKIE_SECURE,
    MEMORY_SEED_ADMIN_PASSWORD: source.MEMORY_SEED_ADMIN_PASSWORD,
    MEMORY_SEED_PT_PASSWORD: source.MEMORY_SEED_PT_PASSWORD,
  });

  if (!parsedEnv.success) {
    throw new Error(`Invalid API environment configuration: ${parsedEnv.error.message}`);
  }

  const storageDriver =
    parsedEnv.data.DATA_STORAGE_DRIVER ??
    parsedEnv.data.AUTH_STORAGE_DRIVER ??
    (parsedEnv.data.NODE_ENV === "test" ? "memory" : "postgres");
  const cookieSecure = parsedEnv.data.COOKIE_SECURE ?? parsedEnv.data.NODE_ENV === "production";
  const corsOrigins = new Set<string>([parsedEnv.data.APP_ORIGIN, parsedEnv.data.CORS_ORIGIN]);

  for (const entry of parsedEnv.data.CORS_ORIGINS?.split(",") ?? []) {
    const candidate = entry.trim();

    if (!candidate) {
      continue;
    }

    const parsedOrigin = z.string().url().safeParse(candidate);

    if (!parsedOrigin.success) {
      throw new Error(`Invalid URL found in CORS_ORIGINS: ${candidate}`);
    }

    corsOrigins.add(parsedOrigin.data);
  }

  if (storageDriver === "postgres" && !parsedEnv.data.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when AUTH_STORAGE_DRIVER=postgres.");
  }

  return {
    ...parsedEnv.data,
    ALLOWED_CORS_ORIGINS: [...corsOrigins],
    AUTH_STORAGE_DRIVER: storageDriver,
    DATA_STORAGE_DRIVER: storageDriver,
    COOKIE_SECURE: cookieSecure,
    CORS_ORIGINS: parsedEnv.data.CORS_ORIGINS ?? null,
    DATABASE_URL: parsedEnv.data.DATABASE_URL ?? null,
  };
}

export type AppEnv = ReturnType<typeof loadEnv>;

export const env = loadEnv({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  APP_ORIGIN: process.env.APP_ORIGIN,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
  DATABASE_URL: process.env.DATABASE_URL,
  DATA_STORAGE_DRIVER: process.env.DATA_STORAGE_DRIVER,
  AUTH_STORAGE_DRIVER: process.env.AUTH_STORAGE_DRIVER,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  SESSION_TTL_HOURS: process.env.SESSION_TTL_HOURS,
  AUTH_RATE_LIMIT_WINDOW_MS: process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX,
  COOKIE_SECURE: process.env.COOKIE_SECURE,
  MEMORY_SEED_ADMIN_PASSWORD: process.env.MEMORY_SEED_ADMIN_PASSWORD,
  MEMORY_SEED_PT_PASSWORD: process.env.MEMORY_SEED_PT_PASSWORD,
});
