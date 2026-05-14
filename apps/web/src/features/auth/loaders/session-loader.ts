import { ApiClientError, logAuthDiagnostic } from "@/lib/http-client";

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
      logAuthDiagnostic("session-bootstrap-unauthorized", {
        code: error.code,
        details: error.details,
        statusCode: error.statusCode,
      });

      return {
        session: null,
      };
    }

    logAuthDiagnostic("session-bootstrap-failed", {
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
            }
          : {
              message: "Unknown error",
            },
    });

    throw error;
  }
}
