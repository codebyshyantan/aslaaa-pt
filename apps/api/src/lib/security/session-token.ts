import { createHash, randomBytes, randomUUID } from "node:crypto";

export function createSessionId() {
  return randomUUID();
}

export function createOpaqueSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
