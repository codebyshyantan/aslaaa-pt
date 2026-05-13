import type { AppEnv } from "../../config/env.js";
import type {
  AuthUserRecord,
  CreateAuditLogInput,
  ManagedUserRecord,
  CreateSessionInput,
  LoginDirectory,
  SessionWithUserRecord,
} from "./auth.types.js";
import { MemoryAuthRepository } from "./repositories/memory-auth-repository.js";
import { PostgresAuthRepository } from "./repositories/postgres-auth-repository.js";

export interface AuthRepository {
  listLoginDirectory(): Promise<LoginDirectory>;
  findUserByUsername(username: string): Promise<AuthUserRecord | null>;
  createSession(input: CreateSessionInput): Promise<void>;
  findSessionByTokenHash(tokenHash: string): Promise<SessionWithUserRecord | null>;
  deleteSessionByTokenHash(tokenHash: string): Promise<SessionWithUserRecord | null>;
  touchSession(sessionId: string, lastSeenAt: string): Promise<void>;
  updateUserLastLogin(userId: string, lastLoginAt: string): Promise<void>;
  createAuditLog(input: CreateAuditLogInput): Promise<void>;
  listUsers(): Promise<ManagedUserRecord[]>;
  createUser(input: {
    createdAt: string;
    isActive: boolean;
    passwordHash: string;
    role: AuthUserRecord["role"];
    updatedAt: string;
    username: string;
  }): Promise<ManagedUserRecord>;
  updateUserStatus(userId: string, isActive: boolean, updatedAt: string): Promise<ManagedUserRecord | null>;
}

export async function createAuthRepository(env: AppEnv): Promise<AuthRepository> {
  if (env.AUTH_STORAGE_DRIVER === "memory") {
    return MemoryAuthRepository.seed({
      adminPassword: env.MEMORY_SEED_ADMIN_PASSWORD,
      ptPassword: env.MEMORY_SEED_PT_PASSWORD,
    });
  }

  return PostgresAuthRepository.create(env.DATABASE_URL!);
}
