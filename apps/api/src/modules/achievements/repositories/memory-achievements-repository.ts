import { randomUUID } from "node:crypto";

import type { AchievementsRepository } from "../achievements.repository.js";
import type { AchievementRecord, CreateAchievementInput } from "../achievements.types.js";

export class MemoryAchievementsRepository implements AchievementsRepository {
  private readonly achievements = new Map<string, AchievementRecord>();

  async create(input: CreateAchievementInput) {
    const achievement: AchievementRecord = {
      id: randomUUID(),
      ...input,
    };

    this.achievements.set(achievement.id, achievement);

    return achievement;
  }

  async list() {
    return [...this.achievements.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }
}
