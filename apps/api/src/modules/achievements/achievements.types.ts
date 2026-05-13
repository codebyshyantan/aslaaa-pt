export interface AchievementRecord {
  createdAt: string;
  createdByUserId: string;
  createdByUsername: string;
  description: string;
  id: string;
  title: string;
}

export interface CreateAchievementInput {
  createdAt: string;
  createdByUserId: string;
  createdByUsername: string;
  description: string;
  title: string;
}
