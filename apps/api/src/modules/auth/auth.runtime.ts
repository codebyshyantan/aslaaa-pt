import type { CorsOptions } from "cors";
import type { CookieOptions } from "express";

import type { AppEnv } from "../../config/env.js";

type AuthRuntimeEnv = Pick<AppEnv, "ALLOWED_CORS_ORIGINS" | "COOKIE_SECURE" | "NODE_ENV">;

function normalizeOrigin(value: string) {
  return new URL(value).origin;
}

export function resolveAuthCorsOptions(env: AuthRuntimeEnv): CorsOptions {
  const allowedOrigins = new Set(env.ALLOWED_CORS_ORIGINS.map((origin) => normalizeOrigin(origin)));

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);

      if (allowedOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin is not allowed: ${origin}`));
    },
  };
}

export function resolveSessionCookieSecurity(
  env: Pick<AppEnv, "COOKIE_SECURE" | "NODE_ENV">,
): Pick<CookieOptions, "sameSite" | "secure"> {
  if (env.NODE_ENV === "production") {
    return {
      sameSite: "none",
      secure: true,
    };
  }

  return {
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
  };
}
