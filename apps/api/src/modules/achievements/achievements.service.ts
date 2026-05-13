import type { AuthenticatedRequestContext } from "../auth/auth.types.js";
import type { AchievementsRepository } from "./achievements.repository.js";
import type { CreateAchievementBody } from "./achievements.validation.js";

type AchievementsServiceDependencies = {
  now?: () => Date;
  repository: AchievementsRepository;
};

export class AchievementsService {
  constructor(
    private readonly repository: AchievementsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  static create({ now, repository }: AchievementsServiceDependencies) {
    return new AchievementsService(repository, now);
  }

  async createAchievement(actor: AuthenticatedRequestContext, payload: CreateAchievementBody) {
    return this.repository.create({
      createdAt: this.now().toISOString(),
      createdByUserId: actor.user.id,
      createdByUsername: actor.user.username,
      description: payload.description,
      title: payload.title,
    });
  }

  async listAchievements() {
    return this.repository.list();
  }

  async recordAutomaticAchievement(actor: AuthenticatedRequestContext, title: string, description: string) {
    return this.repository.create({
      createdAt: this.now().toISOString(),
      createdByUserId: actor.user.id,
      createdByUsername: actor.user.username,
      description,
      title,
    });
  }
}
