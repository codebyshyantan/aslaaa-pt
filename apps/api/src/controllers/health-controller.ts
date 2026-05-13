import type { Request, Response } from "express";

export function getHealth(_request: Request, response: Response) {
  response.status(200).json({
    app: "aslaaa-pt-api",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
