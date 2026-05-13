import type { AppEnv } from "../config/env.js";
import type { ActivityRepository } from "../modules/activity/activity.repository.js";
import { createActivityRepository } from "../modules/activity/activity.repository.js";
import type { AchievementsRepository } from "../modules/achievements/achievements.repository.js";
import { createAchievementsRepository } from "../modules/achievements/achievements.repository.js";
import type { AuthRepository } from "../modules/auth/auth.repository.js";
import { MemoryAuthRepository } from "../modules/auth/repositories/memory-auth-repository.js";
import { PostgresAuthRepository } from "../modules/auth/repositories/postgres-auth-repository.js";
import type { AutomationRepository } from "../modules/automation/automation.repository.js";
import { createAutomationRepository } from "../modules/automation/automation.repository.js";
import type { ScrimsRepository } from "../modules/scrims/scrims.repository.js";
import { createScrimsRepository } from "../modules/scrims/scrims.repository.js";
import type { SuggestionsRepository } from "../modules/suggestions/suggestions.repository.js";
import { createSuggestionsRepository } from "../modules/suggestions/suggestions.repository.js";
import type { TeamsRepository } from "../modules/teams/teams.repository.js";
import { createTeamsRepository } from "../modules/teams/teams.repository.js";
import { ensureDemoUsers } from "./bootstrap.js";
import { createPostgresClient } from "./postgres-client.js";

export interface AppRepositories {
  activity: ActivityRepository;
  achievements: AchievementsRepository;
  auth: AuthRepository;
  automation: AutomationRepository;
  dispose: () => Promise<void>;
  scrims: ScrimsRepository;
  suggestions: SuggestionsRepository;
  teams: TeamsRepository;
}

export async function createAppRepositories(env: AppEnv): Promise<AppRepositories> {
  if (env.DATA_STORAGE_DRIVER === "memory") {
    return {
      activity: createActivityRepository("memory"),
      achievements: createAchievementsRepository("memory"),
      auth: await MemoryAuthRepository.seed({
        adminPassword: env.MEMORY_SEED_ADMIN_PASSWORD,
        ptPassword: env.MEMORY_SEED_PT_PASSWORD,
      }),
      automation: createAutomationRepository("memory"),
      dispose: async () => {},
      scrims: createScrimsRepository("memory"),
      suggestions: createSuggestionsRepository("memory"),
      teams: createTeamsRepository("memory"),
    };
  }

  const sql = createPostgresClient(env.DATABASE_URL!);
  await ensureDemoUsers(sql);

  return {
    activity: createActivityRepository("postgres", sql),
    achievements: createAchievementsRepository("postgres", sql),
    auth: PostgresAuthRepository.fromSql(sql),
    automation: createAutomationRepository("postgres", sql),
    dispose: async () => {
      await sql.end({ timeout: 5 });
    },
    scrims: createScrimsRepository("postgres", sql),
    suggestions: createSuggestionsRepository("postgres", sql),
    teams: createTeamsRepository("postgres", sql),
  };
}
