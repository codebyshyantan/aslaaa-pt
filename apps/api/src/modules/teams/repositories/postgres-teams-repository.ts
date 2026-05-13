import type { Sql } from "postgres";

import type { TeamsRepository } from "../teams.repository.js";
import type { CreateTeamInput, TeamRecord } from "../teams.types.js";

type PostgresTeamRow = {
  created_at: Date | string;
  display_name: string;
  id: string;
  normalized_name: string;
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapTeamRow(row: PostgresTeamRow): TeamRecord {
  return {
    id: row.id,
    normalizedName: row.normalized_name,
    displayName: row.display_name,
    createdAt: toIsoString(row.created_at),
  };
}

export class PostgresTeamsRepository implements TeamsRepository {
  private constructor(private readonly sql: Sql) {}

  static fromSql(sql: Sql) {
    return new PostgresTeamsRepository(sql);
  }

  async createMany(teams: CreateTeamInput[]) {
    if (teams.length === 0) {
      return [];
    }

    return this.sql.begin(async (transaction) => {
      const createdTeams: TeamRecord[] = [];

      for (const team of teams) {
        const [row] = await transaction<PostgresTeamRow[]>`
          insert into teams (normalized_name, display_name, created_at)
          values (${team.normalizedName}, ${team.displayName}, ${team.createdAt})
          returning id, normalized_name, display_name, created_at
        `;

        if (!row) {
          throw new Error("Failed to create team record.");
        }

        createdTeams.push(mapTeamRow(row));
      }

      return createdTeams;
    });
  }

  async findExistingNormalizedNames(normalizedNames: string[]) {
    if (normalizedNames.length === 0) {
      return new Set<string>();
    }

    const rows = await this.sql<Array<{ normalized_name: string }>>`
      select normalized_name
      from teams
      where normalized_name in ${this.sql(normalizedNames)}
    `;

    return new Set(rows.map((row) => row.normalized_name));
  }

  async listTeams() {
    const rows = await this.sql<PostgresTeamRow[]>`
      select id, normalized_name, display_name, created_at
      from teams
      order by normalized_name asc
    `;

    return rows.map(mapTeamRow);
  }
}
