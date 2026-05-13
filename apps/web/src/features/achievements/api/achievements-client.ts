import { apiRequest } from "@/lib/http-client";

export interface AchievementRecord {
  createdAt: string;
  createdByUserId: string;
  createdByUsername: string;
  description: string;
  id: string;
  title: string;
}

export function fetchAchievements() {
  return apiRequest<{ achievements: AchievementRecord[] }>("/achievements", {
    method: "GET",
  });
}

export function createAchievement(payload: { description: string; title: string }) {
  return apiRequest<AchievementRecord>("/achievements", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}
