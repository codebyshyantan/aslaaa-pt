import type { UserRole } from "../auth/auth.types.js";

export const suggestionStatusValues = [
  "PENDING",
  "UNDER_REVIEW",
  "IMPLEMENTED",
  "REJECTED",
] as const;

export type SuggestionStatus = (typeof suggestionStatusValues)[number];

export interface SuggestionRecord {
  createdAt: string;
  description: string;
  id: string;
  status: SuggestionStatus;
  submittedByRole: UserRole;
  submittedByUserId: string;
  submittedByUsername: string;
  title: string;
}

export interface CreateSuggestionInput {
  createdAt: string;
  description: string;
  status: SuggestionStatus;
  submittedByRole: UserRole;
  submittedByUserId: string;
  submittedByUsername: string;
  title: string;
}
