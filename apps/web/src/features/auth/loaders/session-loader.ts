import { ApiClientError } from "@/lib/http-client";

import { fetchSession } from "../api/auth-client";
import type { AuthSession } from "../auth.types";

export interface SessionLoaderData {
  session: AuthSession | null;
}

export async function sessionLoader(): Promise<SessionLoaderData> {
  try {
    return {
      session: await fetchSession(),
    };
  } catch (error) {
    if (error instanceof ApiClientError && error.statusCode === 401) {
      return {
        session: null,
      };
    }

    throw error;
  }
}
