import { hashPassword } from "../../../lib/security/password.js";
import type { AuthRepository } from "../auth.repository.js";
import type {
  AuthUserRecord,
  CreateAuditLogInput,
  CreateSessionInput,
  LoginDirectory,
  ManagedUserRecord,
  SessionRecord,
  SessionWithUserRecord,
  UserRole,
} from "../auth.types.js";

type SeedOptions = {
  adminPassword: string;
  ptPassword: string;
};

const memoryDirectoryDefaults: Array<{
  id: string;
  role: UserRole;
  subtitle: string;
  username: string;
}> = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    role: "ADMIN",
    subtitle: "Primary Administrator",
    username: "ADMIN_MASTER",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    role: "PT_MAKER",
    subtitle: "Demo PT Operations",
    username: "PT_SAHA",
  },
];

export class MemoryAuthRepository implements AuthRepository {
  private readonly directorySubtitles = new Map<string, string>();
  private readonly sessionsById = new Map<string, SessionRecord>();
  private readonly sessionsByTokenHash = new Map<string, string>();
  private readonly usersById = new Map<string, AuthUserRecord>();
  private readonly usersByUsername = new Map<string, AuthUserRecord>();

  public readonly auditLogs: CreateAuditLogInput[] = [];

  static async seed(options: SeedOptions) {
    const repository = new MemoryAuthRepository();
    await repository.seedDefaults(options);
    return repository;
  }

  async listLoginDirectory(): Promise<LoginDirectory> {
    const directory: LoginDirectory = {
      ADMIN: [],
      PT_MAKER: [],
    };

    for (const user of this.usersById.values()) {
      if (!user.isActive) {
        continue;
      }

      directory[user.role].push({
        value: user.username,
        label: user.username,
        subtitle: this.directorySubtitles.get(user.id) ?? (user.role === "ADMIN" ? "Administrator" : "PT Operations"),
      });
    }

    for (const role of Object.keys(directory) as Array<keyof typeof directory>) {
      directory[role].sort((left, right) => left.label.localeCompare(right.label));
    }

    return directory;
  }

  async findUserByUsername(username: string) {
    return this.usersByUsername.get(username.toLowerCase()) ?? null;
  }

  async createSession(input: CreateSessionInput) {
    const sessionRecord: SessionRecord = { ...input };

    this.sessionsById.set(sessionRecord.id, sessionRecord);
    this.sessionsByTokenHash.set(sessionRecord.refreshTokenHash, sessionRecord.id);
  }

  async findSessionByTokenHash(tokenHash: string) {
    const sessionId = this.sessionsByTokenHash.get(tokenHash);

    if (!sessionId) {
      return null;
    }

    const session = this.sessionsById.get(sessionId);

    if (!session) {
      return null;
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      this.sessionsById.delete(session.id);
      this.sessionsByTokenHash.delete(tokenHash);
      return null;
    }

    const user = this.usersById.get(session.userId);

    if (!user) {
      return null;
    }

    return {
      session,
      user,
    } satisfies SessionWithUserRecord;
  }

  async deleteSessionByTokenHash(tokenHash: string) {
    const sessionId = this.sessionsByTokenHash.get(tokenHash);

    if (!sessionId) {
      return null;
    }

    const session = this.sessionsById.get(sessionId);

    if (!session) {
      this.sessionsByTokenHash.delete(tokenHash);
      return null;
    }

    const user = this.usersById.get(session.userId);

    this.sessionsById.delete(sessionId);
    this.sessionsByTokenHash.delete(tokenHash);

    if (!user) {
      return null;
    }

    return {
      session,
      user,
    } satisfies SessionWithUserRecord;
  }

  async touchSession(sessionId: string, lastSeenAt: string) {
    const session = this.sessionsById.get(sessionId);

    if (!session) {
      return;
    }

    session.lastSeenAt = lastSeenAt;
  }

  async updateUserLastLogin(userId: string, lastLoginAt: string) {
    const user = this.usersById.get(userId);

    if (!user) {
      return;
    }

    user.lastLoginAt = lastLoginAt;
    user.updatedAt = lastLoginAt;
  }

  async createAuditLog(input: CreateAuditLogInput) {
    this.auditLogs.push(structuredClone(input));
  }

  async listUsers(): Promise<ManagedUserRecord[]> {
    return [...this.usersById.values()]
      .map((user) => ({
        createdAt: user.createdAt,
        id: user.id,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        role: user.role,
        updatedAt: user.updatedAt,
        username: user.username,
      }))
      .sort((left, right) => left.username.localeCompare(right.username));
  }

  async createUser(input: {
    createdAt: string;
    isActive: boolean;
    passwordHash: string;
    role: AuthUserRecord["role"];
    updatedAt: string;
    username: string;
  }): Promise<ManagedUserRecord> {
    const id = crypto.randomUUID();
    const userRecord: AuthUserRecord = {
      createdAt: input.createdAt,
      id,
      isActive: input.isActive,
      lastLoginAt: null,
      passwordHash: input.passwordHash,
      role: input.role,
      updatedAt: input.updatedAt,
      username: input.username,
    };

    this.usersById.set(id, userRecord);
    this.usersByUsername.set(input.username.toLowerCase(), userRecord);

    return {
      createdAt: userRecord.createdAt,
      id: userRecord.id,
      isActive: userRecord.isActive,
      lastLoginAt: userRecord.lastLoginAt,
      role: userRecord.role,
      updatedAt: userRecord.updatedAt,
      username: userRecord.username,
    };
  }

  async deleteUser(userId: string): Promise<ManagedUserRecord | null> {
    const user = this.usersById.get(userId);

    if (!user) {
      return null;
    }

    this.usersById.delete(userId);
    this.usersByUsername.delete(user.username.toLowerCase());

    for (const [sessionId, session] of this.sessionsById.entries()) {
      if (session.userId !== userId) {
        continue;
      }

      this.sessionsById.delete(sessionId);
      this.sessionsByTokenHash.delete(session.refreshTokenHash);
    }

    return {
      createdAt: user.createdAt,
      id: user.id,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      role: user.role,
      updatedAt: user.updatedAt,
      username: user.username,
    };
  }

  async updateUserPassword(userId: string, passwordHash: string, updatedAt: string): Promise<ManagedUserRecord | null> {
    const user = this.usersById.get(userId);

    if (!user) {
      return null;
    }

    user.passwordHash = passwordHash;
    user.updatedAt = updatedAt;

    for (const [sessionId, session] of this.sessionsById.entries()) {
      if (session.userId !== userId) {
        continue;
      }

      this.sessionsById.delete(sessionId);
      this.sessionsByTokenHash.delete(session.refreshTokenHash);
    }

    return {
      createdAt: user.createdAt,
      id: user.id,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      role: user.role,
      updatedAt: user.updatedAt,
      username: user.username,
    };
  }

  async updateUserStatus(userId: string, isActive: boolean, updatedAt: string): Promise<ManagedUserRecord | null> {
    const user = this.usersById.get(userId);

    if (!user) {
      return null;
    }

    user.isActive = isActive;
    user.updatedAt = updatedAt;

    return {
      createdAt: user.createdAt,
      id: user.id,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      role: user.role,
      updatedAt: user.updatedAt,
      username: user.username,
    };
  }

  private async seedDefaults(options: SeedOptions) {
    const now = new Date().toISOString();
    const adminHash = await hashPassword(options.adminPassword);
    const ptHash = await hashPassword(options.ptPassword);

    for (const entry of memoryDirectoryDefaults) {
      const passwordHash = entry.role === "ADMIN" ? adminHash : ptHash;
      const userRecord: AuthUserRecord = {
        id: entry.id,
        username: entry.username,
        role: entry.role,
        passwordHash,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      };

      this.directorySubtitles.set(entry.id, entry.subtitle);
      this.usersById.set(entry.id, userRecord);
      this.usersByUsername.set(entry.username.toLowerCase(), userRecord);
    }
  }
}
