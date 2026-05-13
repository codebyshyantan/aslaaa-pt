import type { UserRole } from "../auth/auth.types.js";

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

export interface CreateActivityLogInput {
  action: string;
  actorRole: UserRole | null;
  actorUserId: string | null;
  actorUsername: string | null;
  createdAt: string;
  description: string;
  module: string;
  payloadJson: Record<string, unknown>;
  targetId: string | null;
  targetType: string | null;
}
