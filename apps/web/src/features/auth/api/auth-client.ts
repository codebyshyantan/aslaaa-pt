import { apiRequest } from "@/lib/http-client";

import type { AuthSession, LoginFormValues } from "../auth.types";

type AccessProbeResponse = {
  authorized: boolean;
  route: "settings" | "users";
  user: AuthSession["user"] | null;
};

export function loginUser(payload: LoginFormValues) {
  return apiRequest<AuthSession>("/auth/login", {
    body: JSON.stringify(payload),
    method: "POST",
    skipUnauthorizedHandling: true,
  });
}

export function logoutUser() {
  return apiRequest<{ loggedOut: boolean }>("/auth/logout", {
    method: "POST",
    skipUnauthorizedHandling: true,
  });
}

export function fetchSession() {
  return apiRequest<AuthSession>("/auth/session", {
    method: "GET",
    skipUnauthorizedHandling: true,
  });
}

export function verifyAdminAccess(route: "settings" | "users") {
  return apiRequest<AccessProbeResponse>(`/auth/access/${route}`, {
    method: "GET",
  });
}
