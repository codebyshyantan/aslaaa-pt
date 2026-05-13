import { ApiError } from "../../lib/http/api-error.js";
import { hashPassword } from "../../lib/security/password.js";
import { isPostgresUniqueViolation } from "../../persistence/postgres-errors.js";
import type { AuthRepository } from "../auth/auth.repository.js";
import type { CreateUserBody } from "./users.validation.js";

type UsersServiceDependencies = {
  now?: () => Date;
  repository: AuthRepository;
};

export class UsersService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  static create({ now, repository }: UsersServiceDependencies) {
    return new UsersService(repository, now);
  }

  async listUsers() {
    return this.repository.listUsers();
  }

  async createUser(payload: CreateUserBody) {
    const normalizedUsername = payload.username.trim();
    const existingUser = await this.repository.findUserByUsername(normalizedUsername.toLowerCase());

    if (existingUser) {
      throw new ApiError(409, "USER_ALREADY_EXISTS", "A user with this username already exists.");
    }

    const nowIso = this.now().toISOString();
    try {
      return await this.repository.createUser({
        createdAt: nowIso,
        isActive: true,
        passwordHash: await hashPassword(payload.password),
        role: payload.role,
        updatedAt: nowIso,
        username: normalizedUsername,
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error, ["users_username_key"])) {
        throw new ApiError(409, "USER_ALREADY_EXISTS", "A user with this username already exists.");
      }

      throw error;
    }
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await this.repository.updateUserStatus(userId, isActive, this.now().toISOString());

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
    }

    return user;
  }
}
