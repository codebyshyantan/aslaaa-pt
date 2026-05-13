import type { Sql } from "postgres";

import type { CreateTeamInput, TeamRecord } from "./teams.types.js";
import { MemoryTeamsRepository } from "./repositories/memory-teams-repository.js";
import { PostgresTeamsRepository } from "./repositories/postgres-teams-repository.js";

export interface TeamsRepository {
  createMany(teams: CreateTeamInput[]): Promise<TeamRecord[]>;
  findExistingNormalizedNames(normalizedNames: string[]): Promise<Set<string>>;
  listTeams(): Promise<TeamRecord[]>;
}

export function createTeamsRepository(storageDriver: "memory" | "postgres", sql?: Sql) {
  if (storageDriver === "memory") {
    return new MemoryTeamsRepository();
  }

  if (!sql) {
    throw new Error("A Postgres SQL client is required for the teams repository.");
  }

  return PostgresTeamsRepository.fromSql(sql);
}
