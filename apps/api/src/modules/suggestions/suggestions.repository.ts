import type { Sql } from "postgres";

import { MemorySuggestionsRepository } from "./repositories/memory-suggestions-repository.js";
import { PostgresSuggestionsRepository } from "./repositories/postgres-suggestions-repository.js";
import type { CreateSuggestionInput, SuggestionRecord, SuggestionStatus } from "./suggestions.types.js";

export interface SuggestionsRepository {
  create(input: CreateSuggestionInput): Promise<SuggestionRecord>;
  list(): Promise<SuggestionRecord[]>;
  updateStatus(id: string, status: SuggestionStatus): Promise<SuggestionRecord | null>;
}

export function createSuggestionsRepository(storageDriver: "memory" | "postgres", sql?: Sql) {
  if (storageDriver === "memory") {
    return new MemorySuggestionsRepository();
  }

  if (!sql) {
    throw new Error("A Postgres SQL client is required for the suggestions repository.");
  }

  return PostgresSuggestionsRepository.fromSql(sql);
}
