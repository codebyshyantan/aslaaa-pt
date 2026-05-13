import type { AppEnv } from "../../config/env.js";
import { ApiError } from "../../lib/http/api-error.js";
import { hashPassword, verifyPassword } from "../../lib/security/password.js";
import {
  createOpaqueSessionToken,
  createSessionId,
  hashSessionToken,
} from "../../lib/security/session-token.js";
import type { AuthRepository } from "./auth.repository.js";
import type {
  AuthRequestMetadata,
  AuthenticatedRequestContext,
  CreateAuditLogInput,
  LoginDirectory,
  UserRole,
} from "./auth.types.js";
import { toAuthenticatedRequestContext } from "./auth.types.js";
import type { LoginRequestBody } from "./auth.validation.js";

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

type AuthServiceDependencies = {
  env: Pick<AppEnv, "SESSION_TTL_HOURS">;
  now?: () => Date;
  repository: AuthRepository;
};

export class AuthService {
  private constructor(
    private readonly dummyPasswordHash: string,
    private readonly env: Pick<AppEnv, "SESSION_TTL_HOURS">,
    private readonly now: () => Date,
    private readonly repository: AuthRepository,
  ) {}

  static async create({ env, now = () => new Date(), repository }: AuthServiceDependencies) {
    return new AuthService(await hashPassword("aslaaa-pt-auth-sentinel"), env, now, repository);
  }

  async getLoginDirectory(): Promise<LoginDirectory> {
    return this.repository.listLoginDirectory();
  }

  async login(
    credentials: LoginRequestBody,
    metadata: AuthRequestMetadata,
  ): Promise<{ context: AuthenticatedRequestContext; sessionToken: string }> {
    const normalizedUsername = credentials.username.trim().toLowerCase();
    const user = await this.repository.findUserByUsername(normalizedUsername);
    const passwordHash = user?.passwordHash ?? this.dummyPasswordHash;
    const passwordValid = await verifyPassword(passwordHash, credentials.password);
    const roleValid = user?.role === credentials.role;
    const activeUser = Boolean(user?.isActive);

    if (!user || !activeUser || !roleValid || !passwordValid) {
      await this.writeAuditLog({
        action: "FAILED_LOGIN",
        actorUserId: user?.id ?? null,
        createdAt: this.now().toISOString(),
        payloadJson: {
          attemptedRole: credentials.role,
          ip: metadata.ip,
          method: metadata.method,
          path: metadata.path,
          reason: !user
            ? "USER_NOT_FOUND"
            : !activeUser
              ? "USER_INACTIVE"
              : !roleValid
                ? "ROLE_MISMATCH"
                : "INVALID_PASSWORD",
          userAgent: metadata.userAgent,
          username: credentials.username,
        },
      });

      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid role, username, or password.");
    }

    const issuedAt = this.now();
    const createdAt = issuedAt.toISOString();
    const expiresAt = addHours(issuedAt, this.env.SESSION_TTL_HOURS).toISOString();
    const sessionToken = createOpaqueSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const sessionId = createSessionId();

    await this.repository.createSession({
      id: sessionId,
      userAgent: metadata.userAgent,
      userId: user.id,
      createdAt,
      expiresAt,
      ip: metadata.ip,
      lastSeenAt: createdAt,
      refreshTokenHash: sessionTokenHash,
    });
    await this.repository.updateUserLastLogin(user.id, createdAt);

    const refreshedUser = {
      ...user,
      lastLoginAt: createdAt,
      updatedAt: createdAt,
    };

    await this.writeAuditLog({
      action: "LOGIN",
      actorUserId: user.id,
      createdAt,
      payloadJson: {
        ip: metadata.ip,
        method: metadata.method,
        path: metadata.path,
        role: user.role,
        userAgent: metadata.userAgent,
        username: user.username,
      },
    });

    return {
      context: toAuthenticatedRequestContext({
        session: {
          id: sessionId,
          userAgent: metadata.userAgent,
          userId: user.id,
          createdAt,
          expiresAt,
          ip: metadata.ip,
          lastSeenAt: createdAt,
          refreshTokenHash: sessionTokenHash,
        },
        user: refreshedUser,
      }),
      sessionToken,
    };
  }

  async logout(sessionToken: string, metadata: AuthRequestMetadata) {
    const deletedSession = await this.repository.deleteSessionByTokenHash(hashSessionToken(sessionToken));

    if (!deletedSession) {
      return false;
    }

    await this.writeAuditLog({
      action: "LOGOUT",
      actorUserId: deletedSession.user.id,
      createdAt: this.now().toISOString(),
      payloadJson: {
        ip: metadata.ip,
        method: metadata.method,
        path: metadata.path,
        role: deletedSession.user.role,
        sessionId: deletedSession.session.id,
        userAgent: metadata.userAgent,
        username: deletedSession.user.username,
      },
    });

    return true;
  }

  async resolveSession(sessionToken: string | null) {
    if (!sessionToken) {
      return null;
    }

    const sessionRecord = await this.repository.findSessionByTokenHash(hashSessionToken(sessionToken));

    if (!sessionRecord || !sessionRecord.user.isActive) {
      return null;
    }

    const nowIso = this.now().toISOString();
    await this.repository.touchSession(sessionRecord.session.id, nowIso);

    return toAuthenticatedRequestContext({
      session: {
        ...sessionRecord.session,
        lastSeenAt: nowIso,
      },
      user: sessionRecord.user,
    });
  }

  async recordInvalidAccess(metadata: AuthRequestMetadata, reason: string, actorUserId: string | null = null) {
    await this.writeAuditLog({
      action: "INVALID_ACCESS_ATTEMPT",
      actorUserId,
      createdAt: this.now().toISOString(),
      payloadJson: {
        ip: metadata.ip,
        method: metadata.method,
        path: metadata.path,
        reason,
        userAgent: metadata.userAgent,
      },
    });
  }

  async recordRoleViolation(
    actor: AuthenticatedRequestContext,
    metadata: AuthRequestMetadata,
    requiredRoles: UserRole[],
  ) {
    await this.writeAuditLog({
      action: "ROLE_VIOLATION",
      actorUserId: actor.user.id,
      createdAt: this.now().toISOString(),
      payloadJson: {
        actualRole: actor.user.role,
        ip: metadata.ip,
        method: metadata.method,
        path: metadata.path,
        requiredRoles,
        userAgent: metadata.userAgent,
        username: actor.user.username,
      },
    });
  }

  private async writeAuditLog(input: CreateAuditLogInput) {
    await this.repository.createAuditLog(input);
  }
}
