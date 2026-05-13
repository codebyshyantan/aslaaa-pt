import { ApiError } from "../../lib/http/api-error.js";
import { isPostgresUniqueViolation } from "../../persistence/postgres-errors.js";
import type { CreateActivityLogInput } from "../activity/activity.types.js";
import type { AuthenticatedRequestContext } from "../auth/auth.types.js";
import { parseTeamImportInput } from "./teams.parser.js";
import type { TeamsRepository } from "./teams.repository.js";
import type { TeamImportDuplicate, TeamImportResult } from "./teams.types.js";

type TeamsServiceDependencies = {
  now?: () => Date;
  recordActivity?: (input: CreateActivityLogInput) => Promise<unknown>;
  repository: TeamsRepository;
};

export class TeamsService {
  constructor(
    private readonly repository: TeamsRepository,
    private readonly recordActivity?: (input: CreateActivityLogInput) => Promise<unknown>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  static create({ now, recordActivity, repository }: TeamsServiceDependencies) {
    return new TeamsService(repository, recordActivity, now);
  }

  async importTeams(actor: AuthenticatedRequestContext, rawInput: string): Promise<TeamImportResult> {
    const { invalidLines, parsedLines } = parseTeamImportInput(rawInput);

    if (parsedLines.length === 0) {
      throw new ApiError(400, "NO_VALID_TEAMS", "No valid team names were found in the import payload.");
    }

    const seenInBatch = new Set<string>();
    const duplicates: TeamImportDuplicate[] = [];
    const uniqueCandidates = [];

    for (const line of parsedLines) {
      if (seenInBatch.has(line.normalizedName)) {
        duplicates.push({
          ...line,
          reason: "DUPLICATE_IN_IMPORT",
        });
        continue;
      }

      seenInBatch.add(line.normalizedName);
      uniqueCandidates.push(line);
    }

    const existingNames = await this.repository.findExistingNormalizedNames(
      uniqueCandidates.map((candidate) => candidate.normalizedName),
    );

    const creatableTeams = uniqueCandidates.filter((candidate) => {
      if (existingNames.has(candidate.normalizedName)) {
        duplicates.push({
          ...candidate,
          reason: "ALREADY_EXISTS",
        });
        return false;
      }

      return true;
    });

    const createdAt = this.now().toISOString();
    let createdTeams;

    try {
      createdTeams = await this.repository.createMany(
        creatableTeams.map((team) => ({
          createdAt,
          displayName: team.displayName,
          normalizedName: team.normalizedName,
        })),
      );
    } catch (error) {
      if (isPostgresUniqueViolation(error, ["teams_normalized_name_key"])) {
        throw new ApiError(
          409,
          "TEAM_IMPORT_CONFLICT",
          "The team registry changed during import. Refresh the registry and retry the import.",
        );
      }

      throw error;
    }

    const result = {
      addedCount: createdTeams.length,
      addedTeams: createdTeams,
      duplicateCount: duplicates.length,
      duplicates: duplicates.sort((left, right) => left.lineNumber - right.lineNumber),
      invalidCount: invalidLines.length,
      invalidLines: invalidLines.sort((left, right) => left.lineNumber - right.lineNumber),
      parsedCount: parsedLines.length,
    };

    if (this.recordActivity) {
      await this.recordActivity({
        action: "IMPORT_TEAMS",
        actorRole: actor.user.role,
        actorUserId: actor.user.id,
        actorUsername: actor.user.username,
        createdAt: this.now().toISOString(),
        description: `Imported ${result.addedCount} teams with ${result.duplicateCount} duplicates and ${result.invalidCount} invalid lines.`,
        module: "UNIQUE_TEAMS",
        payloadJson: {
          addedCount: result.addedCount,
          duplicateCount: result.duplicateCount,
          invalidCount: result.invalidCount,
          parsedCount: result.parsedCount,
        },
        targetId: null,
        targetType: "TEAM_IMPORT",
      });
    }

    return result;
  }

  async listTeams() {
    return this.repository.listTeams();
  }
}
