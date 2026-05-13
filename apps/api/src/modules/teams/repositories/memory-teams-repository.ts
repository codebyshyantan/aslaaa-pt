import { randomUUID } from "node:crypto";

import type { TeamsRepository } from "../teams.repository.js";
import type { CreateTeamInput, TeamRecord } from "../teams.types.js";

export class MemoryTeamsRepository implements TeamsRepository {
  private readonly teamsById = new Map<string, TeamRecord>();
  private readonly teamIdsByNormalizedName = new Map<string, string>();

  async createMany(teams: CreateTeamInput[]) {
    const createdTeams: TeamRecord[] = [];

    for (const team of teams) {
      const id = randomUUID();
      const teamRecord: TeamRecord = {
        id,
        normalizedName: team.normalizedName,
        displayName: team.displayName,
        createdAt: team.createdAt,
      };

      this.teamsById.set(id, teamRecord);
      this.teamIdsByNormalizedName.set(team.normalizedName, id);
      createdTeams.push(teamRecord);
    }

    return createdTeams;
  }

  async findExistingNormalizedNames(normalizedNames: string[]) {
    const existingNames = new Set<string>();

    for (const normalizedName of normalizedNames) {
      if (this.teamIdsByNormalizedName.has(normalizedName)) {
        existingNames.add(normalizedName);
      }
    }

    return existingNames;
  }

  async listTeams() {
    return [...this.teamsById.values()].sort((left, right) =>
      left.normalizedName.localeCompare(right.normalizedName),
    );
  }
}
