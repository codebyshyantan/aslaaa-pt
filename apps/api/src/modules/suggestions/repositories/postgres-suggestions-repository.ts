import type { Sql } from "postgres";

import type { SuggestionsRepository } from "../suggestions.repository.js";
import type { CreateSuggestionInput, SuggestionRecord, SuggestionStatus } from "../suggestions.types.js";

type SuggestionRow = {
  created_at: Date | string;
  description: string;
  id: string;
  status: SuggestionStatus;
  submitted_by_role: SuggestionRecord["submittedByRole"];
  submitted_by_user_id: string;
  submitted_by_username: string;
  title: string;
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapSuggestionRow(row: SuggestionRow): SuggestionRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    submittedByRole: row.submitted_by_role,
    submittedByUserId: row.submitted_by_user_id,
    submittedByUsername: row.submitted_by_username,
    createdAt: toIsoString(row.created_at),
  };
}

export class PostgresSuggestionsRepository implements SuggestionsRepository {
  private constructor(private readonly sql: Sql) {}

  static fromSql(sql: Sql) {
    return new PostgresSuggestionsRepository(sql);
  }

  async create(input: CreateSuggestionInput) {
    const [row] = await this.sql<SuggestionRow[]>`
      insert into suggestions (
        title,
        description,
        submitted_by_user_id,
        submitted_by_username,
        submitted_by_role,
        status,
        created_at
      )
      values (
        ${input.title},
        ${input.description},
        ${input.submittedByUserId},
        ${input.submittedByUsername},
        ${input.submittedByRole},
        ${input.status},
        ${input.createdAt}
      )
      returning id, title, description, submitted_by_user_id, submitted_by_username, submitted_by_role, status, created_at
    `;

    if (!row) {
      throw new Error("Failed to create suggestion.");
    }

    return mapSuggestionRow(row);
  }

  async list() {
    const rows = await this.sql<SuggestionRow[]>`
      select id, title, description, submitted_by_user_id, submitted_by_username, submitted_by_role, status, created_at
      from suggestions
      order by created_at desc
    `;

    return rows.map(mapSuggestionRow);
  }

  async updateStatus(id: string, status: SuggestionStatus) {
    const [row] = await this.sql<SuggestionRow[]>`
      update suggestions
      set status = ${status}
      where id = ${id}
      returning id, title, description, submitted_by_user_id, submitted_by_username, submitted_by_role, status, created_at
    `;

    return row ? mapSuggestionRow(row) : null;
  }
}
