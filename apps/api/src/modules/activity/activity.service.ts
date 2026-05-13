import type { ActivityRepository } from "./activity.repository.js";

type ActivityServiceDependencies = {
  repository: ActivityRepository;
};

export class ActivityService {
  constructor(private readonly repository: ActivityRepository) {}

  static create({ repository }: ActivityServiceDependencies) {
    return new ActivityService(repository);
  }

  async listRecent(limit = 20) {
    return this.repository.listRecent(limit);
  }
}
