const defaultApiBaseUrl = "http://localhost:4000/api";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl;

export const apiClientConfig = Object.freeze({
  baseUrl: apiBaseUrl,
  credentials: "include" as const,
});

interface ApiRequestInit extends Omit<RequestInit, "credentials"> {
  skipUnauthorizedHandling?: boolean;
}

type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    details?: unknown;
    message: string;
  };
};

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
};

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function isProductionClient() {
  return import.meta.env.PROD || import.meta.env.MODE === "production";
}

function serializeError(error: unknown) {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      details: error.details,
      message: error.message,
      name: error.name,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  return {
    message: "Unknown error",
  };
}

export function logAuthDiagnostic(event: string, details: Record<string, unknown> = {}) {
  if (!isProductionClient()) {
    return;
  }

  console.warn("[auth-diagnostic]", {
    apiBaseUrl: apiClientConfig.baseUrl,
    event,
    frontendOrigin: window.location.origin,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

function parseResponseBody(bodyText: string) {
  if (!bodyText) {
    return null;
  }

  try {
    return JSON.parse(bodyText) as ApiErrorEnvelope | ApiSuccessEnvelope<unknown>;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, init?: ApiRequestInit) {
  const headers = new Headers(init?.headers ?? undefined);

  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${apiClientConfig.baseUrl}${path}`, {
      ...init,
      credentials: apiClientConfig.credentials,
      headers,
    });
  } catch (error) {
    if (path.startsWith("/auth/")) {
      logAuthDiagnostic("network-request-failed", {
        error: serializeError(error),
        path,
      });
    }

    throw error;
  }

  const responseText = await response.text();
  const payload = parseResponseBody(responseText) as ApiErrorEnvelope | ApiSuccessEnvelope<T> | null;

  if (response.status === 401 && !init?.skipUnauthorizedHandling) {
    logAuthDiagnostic("unauthorized-response", {
      path,
      statusCode: response.status,
    });
    window.dispatchEvent(new Event("auth:unauthorized"));
  }

  if (!response.ok || !payload?.success) {
    const errorPayload = payload as ApiErrorEnvelope | null;
    const apiError = new ApiClientError(
      errorPayload?.error?.code ?? "HTTP_ERROR",
      errorPayload?.error?.message ?? "Request failed.",
      response.status,
      errorPayload?.error?.details,
    );

    if (path.startsWith("/auth/")) {
      logAuthDiagnostic("auth-request-failed", {
        error: serializeError(apiError),
        path,
      });
    }

    throw apiError;
  }

  return payload.data;
}
