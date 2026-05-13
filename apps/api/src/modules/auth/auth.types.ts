import {
  getAccessibleRoutesForRole,
  roleValues,
  type ProtectedAppRoute,
  type UserRole,
} from "../../contracts/app-contract.js";
export { roleValues };
export type { ProtectedAppRoute, UserRole };

export const auditActionValues = [
  "LOGIN",
  "LOGOUT",
  "FAILED_LOGIN",
  "ROLE_VIOLATION",
  "INVALID_ACCESS_ATTEMPT",
] as const;
export type AuditAction = (typeof auditActionValues)[number];

export const accessibleRoutesByRole: Record<UserRole, ProtectedAppRoute[]> = {
  ADMIN: getAccessibleRoutesForRole("ADMIN"),
  PT_MAKER: getAccessibleRoutesForRole("PT_MAKER"),
};

export interface AuthUserRecord {
  id: string;
  username: string;
  role: UserRole;
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface ManagedUserRecord {
  createdAt: string;
  id: string;
  isActive: boolean;
  lastLoginAt: string | null;
  role: UserRole;
  updatedAt: string;
  username: string;
}

export interface PublicAuthUser {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  refreshTokenHash: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  ip: string | null;
  userAgent: string | null;
}

export interface SessionWithUserRecord {
  session: SessionRecord;
  user: AuthUserRecord;
}

export interface AuthenticatedRequestContext {
  user: PublicAuthUser;
  accessibleRoutes: ProtectedAppRoute[];
  expiresAt: string;
  sessionId: string;
}

export interface AuthSessionResponse {
  user: PublicAuthUser;
  accessibleRoutes: ProtectedAppRoute[];
  expiresAt: string;
}

export interface LoginDirectoryEntry {
  value: string;
  label: string;
  subtitle: string;
}

export type LoginDirectory = Record<UserRole, LoginDirectoryEntry[]>;

export interface CreateSessionInput {
  id: string;
  userId: string;
  refreshTokenHash: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  ip: string | null;
  userAgent: string | null;
}

export interface CreateAuditLogInput {
  actorUserId: string | null;
  action: AuditAction;
  payloadJson: Record<string, unknown>;
  createdAt: string;
}

export interface AuthRequestMetadata {
  ip: string | null;
  method: string;
  path: string;
  userAgent: string | null;
}

export function toPublicAuthUser(user: AuthUserRecord): PublicAuthUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
  };
}

export function toAuthenticatedRequestContext(record: SessionWithUserRecord): AuthenticatedRequestContext {
  return {
    user: toPublicAuthUser(record.user),
    accessibleRoutes: getAccessibleRoutesForRole(record.user.role),
    expiresAt: record.session.expiresAt,
    sessionId: record.session.id,
  };
}

export function toAuthSessionResponse(context: AuthenticatedRequestContext): AuthSessionResponse {
  return {
    user: context.user,
    accessibleRoutes: context.accessibleRoutes,
    expiresAt: context.expiresAt,
  };
}
