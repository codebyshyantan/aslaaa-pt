const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

interface ApiRequestInit extends RequestInit {
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

  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  const responseText = await response.text();
  const payload = parseResponseBody(responseText) as ApiErrorEnvelope | ApiSuccessEnvelope<T> | null;

  if (response.status === 401 && !init?.skipUnauthorizedHandling) {
    window.dispatchEvent(new Event("auth:unauthorized"));
  }

  if (!response.ok || !payload?.success) {
    const errorPayload = payload as ApiErrorEnvelope | null;

    throw new ApiClientError(
      errorPayload?.error?.code ?? "HTTP_ERROR",
      errorPayload?.error?.message ?? "Request failed.",
      response.status,
      errorPayload?.error?.details,
    );
  }

  return payload.data;
}
