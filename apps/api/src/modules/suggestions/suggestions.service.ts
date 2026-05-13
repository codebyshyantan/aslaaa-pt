import { ApiError } from "../../lib/http/api-error.js";
import type { AuthenticatedRequestContext } from "../auth/auth.types.js";
import type { SuggestionsRepository } from "./suggestions.repository.js";
import type { CreateSuggestionBody, UpdateSuggestionStatusBody } from "./suggestions.validation.js";

type SuggestionsServiceDependencies = {
  now?: () => Date;
  repository: SuggestionsRepository;
};

export class SuggestionsService {
  constructor(
    private readonly repository: SuggestionsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  static create({ now, repository }: SuggestionsServiceDependencies) {
    return new SuggestionsService(repository, now);
  }

  async createSuggestion(actor: AuthenticatedRequestContext, payload: CreateSuggestionBody) {
    return this.repository.create({
      createdAt: this.now().toISOString(),
      description: payload.description,
      status: "PENDING",
      submittedByRole: actor.user.role,
      submittedByUserId: actor.user.id,
      submittedByUsername: actor.user.username,
      title: payload.title,
    });
  }

  async listSuggestions() {
    return this.repository.list();
  }

  async updateStatus(id: string, payload: UpdateSuggestionStatusBody) {
    const suggestion = await this.repository.updateStatus(id, payload.status);

    if (!suggestion) {
      throw new ApiError(404, "SUGGESTION_NOT_FOUND", "Suggestion not found.");
    }

    return suggestion;
  }
}
