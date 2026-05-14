import type { CookieOptions, Response } from "express";

import type { AppEnv } from "../../config/env.js";
import { resolveSessionCookieSecurity } from "./auth.runtime.js";

function buildCookieBaseOptions(env: Pick<AppEnv, "COOKIE_SECURE" | "NODE_ENV">): CookieOptions {
  return {
    httpOnly: true,
    path: "/",
    ...resolveSessionCookieSecurity(env),
  };
}

export function writeSessionCookie(
  response: Response,
  env: Pick<AppEnv, "COOKIE_SECURE" | "NODE_ENV" | "SESSION_COOKIE_NAME">,
  token: string,
  expiresAt: string,
) {
  response.cookie(env.SESSION_COOKIE_NAME, token, {
    ...buildCookieBaseOptions(env),
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(
  response: Response,
  env: Pick<AppEnv, "COOKIE_SECURE" | "NODE_ENV" | "SESSION_COOKIE_NAME">,
) {
  response.clearCookie(env.SESSION_COOKIE_NAME, buildCookieBaseOptions(env));
}
