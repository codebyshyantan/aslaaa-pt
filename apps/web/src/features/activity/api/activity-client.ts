import type { UserRole } from "@/features/auth/auth.types";
import { apiRequest } from "@/lib/http-client";

export interface ActivityLogRecord {
  action: string;
  actorRole: UserRole | null;
  actorUserId: string | null;
  actorUsername: string | null;
  createdAt: string;
  description: string;
  id: string;
  module: string;
  payloadJson: Record<string, unknown>;
  targetId: string | null;
  targetType: string | null;
}

export function fetchActivityLogs(limit = 20) {
  return apiRequest<{ logs: ActivityLogRecord[] }>(`/activity-logs?limit=${limit}`, {
    method: "GET",
  });
}
