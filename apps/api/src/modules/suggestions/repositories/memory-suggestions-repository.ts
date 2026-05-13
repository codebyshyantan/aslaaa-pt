import { randomUUID } from "node:crypto";

import type { SuggestionsRepository } from "../suggestions.repository.js";
import type { CreateSuggestionInput, SuggestionRecord, SuggestionStatus } from "../suggestions.types.js";

export class MemorySuggestionsRepository implements SuggestionsRepository {
  private readonly suggestions = new Map<string, SuggestionRecord>();

  async create(input: CreateSuggestionInput) {
    const suggestion: SuggestionRecord = {
      id: randomUUID(),
      ...input,
    };

    this.suggestions.set(suggestion.id, suggestion);

    return suggestion;
  }

  async list() {
    return [...this.suggestions.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }

  async updateStatus(id: string, status: SuggestionStatus) {
    const suggestion = this.suggestions.get(id);

    if (!suggestion) {
      return null;
    }

    suggestion.status = status;
    return suggestion;
  }
}
