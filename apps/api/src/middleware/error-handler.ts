import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { isApiError } from "../lib/http/api-error.js";

export function notFoundHandler(request: Request, response: Response) {
  response.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `No route registered for ${request.method} ${request.originalUrl}`,
      requestId: request.requestId,
    },
  });
}

export function errorHandler(
  error: Error | unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  const statusCode = isApiError(error) ? error.statusCode : 500;
  const code = isApiError(error) ? error.code : "INTERNAL_SERVER_ERROR";
  const message =
    isApiError(error) && error.message ? error.message : "Unexpected server error.";

  response.status(statusCode).json({
    success: false,
    error: {
      code,
      details: isApiError(error)
        ? error.details
        : env.NODE_ENV === "production"
          ? undefined
          : error instanceof Error
            ? error.stack
            : String(error),
      message,
      requestId: _request.requestId,
    },
  });
}
