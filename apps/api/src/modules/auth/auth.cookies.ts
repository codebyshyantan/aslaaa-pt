import type { CookieOptions, Response } from "express";

import type { AppEnv } from "../../config/env.js";

function buildCookieBaseOptions(env: Pick<AppEnv, "COOKIE_SECURE">): CookieOptions {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: env.COOKIE_SECURE,
  };
}

export function writeSessionCookie(
  response: Response,
  env: Pick<AppEnv, "COOKIE_SECURE" | "SESSION_COOKIE_NAME">,
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
  env: Pick<AppEnv, "COOKIE_SECURE" | "SESSION_COOKIE_NAME">,
) {
  response.clearCookie(env.SESSION_COOKIE_NAME, buildCookieBaseOptions(env));
}
